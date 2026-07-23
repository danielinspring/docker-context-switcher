//! Typed Docker operations built on top of [`crate::platform::run_docker`].
//!
//! Data is sourced from the CLI's structured output:
//! - `docker context ls --format {{json .}}`  → one JSON object per line
//! - `docker system df --format {{json .}}`    → per-category disk usage
//! - `docker system df -v --format {{json .}}` → one object with detail arrays
//!   (the only place volume *sizes* and per-image container counts are exposed)
//! - `docker ps -a`, `docker image ls`, `docker network ls`
//!
//! Every mutating call maps to a single non-interactive CLI command.

use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::platform::{default_local_socket, docker_path, run_docker_ok};

// Read operations should feel instant locally but tolerate SSH round-trips.
const LIST_TIMEOUT: Duration = Duration::from_secs(25);
const PING_TIMEOUT: Duration = Duration::from_secs(8);
// Prune / image removal can genuinely take a while on a large daemon.
const MUTATE_TIMEOUT: Duration = Duration::from_secs(120);

// ---------------------------------------------------------------------------
// Types (serialised to the WebView as camelCase)
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DockerContext {
    pub name: String,
    pub description: Option<String>,
    pub endpoint: String,
    pub kind: ContextKind,
    pub active: bool,
}

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum ContextKind {
    Local,
    Ssh,
    Tcp,
}

impl ContextKind {
    fn from_endpoint(endpoint: &str) -> Self {
        if endpoint.starts_with("ssh://") {
            ContextKind::Ssh
        } else if endpoint.starts_with("tcp://") {
            ContextKind::Tcp
        } else {
            ContextKind::Local
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub state: EngineState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,
}

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
#[allow(dead_code)] // `Unknown` is the frontend's initial state; the backend never emits it.
pub enum EngineState {
    Running,
    Stopped,
    NotInstalled,
    Unknown,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewSshContext {
    pub name: String,
    pub user: String,
    pub host: String,
    pub port: u16,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Container {
    pub id: String,
    pub name: String,
    pub image: String,
    pub state: String,
    pub status: String,
    pub ports: String,
    pub running: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Image {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub size: String,
    pub created: String,
    pub containers: i64,
    pub dangling: bool,
    pub in_use: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    pub name: String,
    pub driver: String,
    pub size: String,
    pub links: i64,
    pub in_use: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Network {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
    pub predefined: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiskCategory {
    /// Stable key: `images` | `containers` | `volumes` | `build-cache`.
    pub key: String,
    pub label: String,
    pub size: String,
    /// Raw reclaimable string, e.g. `"4.894GB (63%)"`.
    pub reclaimable: String,
    pub total_count: i64,
    pub active: i64,
    /// Whether there is anything to reclaim (drives the prune button state).
    pub reclaimable_bytes: bool,
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

/// Parse newline-delimited JSON (one object per line) into values.
fn parse_ndjson(stdout: &str) -> Vec<Value> {
    stdout
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str::<Value>(l).ok())
        .collect()
}

fn str_field(value: &Value, key: &str) -> String {
    value.get(key).and_then(Value::as_str).unwrap_or("").to_string()
}

/// Parse a numeric field that Docker emits as a string (e.g. `"3"`, `"N/A"`).
fn num_field(value: &Value, key: &str) -> i64 {
    value
        .get(key)
        .and_then(Value::as_str)
        .and_then(|s| s.trim().parse::<i64>().ok())
        .unwrap_or(-1)
}

// ---------------------------------------------------------------------------
// Contexts + engine status
// ---------------------------------------------------------------------------

pub fn list_contexts() -> Result<Vec<DockerContext>, String> {
    let stdout = run_docker_ok(None, &["context", "ls", "--format", "{{json .}}"], LIST_TIMEOUT)?;
    let mut contexts: Vec<DockerContext> = parse_ndjson(&stdout)
        .iter()
        .map(|v| {
            let endpoint = str_field(v, "DockerEndpoint");
            let description = str_field(v, "Description");
            DockerContext {
                name: str_field(v, "Name"),
                description: (!description.is_empty()).then_some(description),
                kind: ContextKind::from_endpoint(&endpoint),
                endpoint,
                active: v.get("Current").and_then(Value::as_bool).unwrap_or(false),
            }
        })
        .filter(|c| !c.name.is_empty())
        .collect();

    // Stable ordering: local contexts first, then alphabetical.
    contexts.sort_by(|a, b| {
        let rank = |k: &ContextKind| matches!(k, ContextKind::Local) as u8;
        rank(&b.kind)
            .cmp(&rank(&a.kind))
            .then_with(|| a.name.cmp(&b.name))
    });
    Ok(contexts)
}

/// Health of the *local* daemon, independent of which context is active.
pub fn local_engine_status() -> Result<EngineStatus, String> {
    if docker_path().is_none() {
        return Ok(EngineStatus {
            state: EngineState::NotInstalled,
            version: None,
            endpoint: None,
        });
    }

    // Prefer a local-kind context; fall back to whatever `default` resolves to.
    let contexts = list_contexts().unwrap_or_default();
    let local = contexts
        .iter()
        .find(|c| matches!(c.kind, ContextKind::Local) && c.active)
        .or_else(|| contexts.iter().find(|c| matches!(c.kind, ContextKind::Local)));

    let (ctx, endpoint) = match local {
        Some(c) => (Some(c.name.as_str()), c.endpoint.clone()),
        None => (None, default_local_socket().to_string()),
    };

    match run_docker_ok(ctx, &["version", "--format", "{{.Server.Version}}"], PING_TIMEOUT) {
        Ok(version) if !version.is_empty() => Ok(EngineStatus {
            state: EngineState::Running,
            version: Some(version),
            endpoint: Some(endpoint),
        }),
        _ => Ok(EngineStatus {
            state: EngineState::Stopped,
            version: None,
            endpoint: Some(endpoint),
        }),
    }
}

pub fn switch_context(name: &str) -> Result<(), String> {
    validate_context_name(name)?;
    run_docker_ok(None, &["context", "use", name], LIST_TIMEOUT)?;
    Ok(())
}

pub fn create_ssh_context(spec: &NewSshContext) -> Result<DockerContext, String> {
    validate_context_name(&spec.name)?;
    if spec.user.trim().is_empty() || spec.user.contains(char::is_whitespace) {
        return Err("SSH user is invalid".into());
    }
    if spec.host.trim().is_empty() || spec.host.contains(char::is_whitespace) {
        return Err("SSH host is invalid".into());
    }

    let endpoint = format!("ssh://{}@{}:{}", spec.user, spec.host, spec.port);
    let docker_arg = format!("host={endpoint}");
    run_docker_ok(
        None,
        &["context", "create", &spec.name, "--docker", &docker_arg],
        LIST_TIMEOUT,
    )?;

    Ok(DockerContext {
        name: spec.name.clone(),
        description: Some("Remote SSH endpoint".into()),
        kind: ContextKind::Ssh,
        endpoint,
        active: false,
    })
}

/// Mirror Docker's own context-name restrictions and reject anything that
/// smells like an argument or path (defence-in-depth on top of arg vectors).
fn validate_context_name(name: &str) -> Result<(), String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("context name must not be empty".into());
    }
    let first_ok = name
        .chars()
        .next()
        .map(|c| c.is_ascii_alphanumeric())
        .unwrap_or(false);
    let rest_ok = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '+' | '-'));
    if !first_ok || !rest_ok {
        return Err("context name may contain only letters, digits, and _.+-".into());
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Resource listings
// ---------------------------------------------------------------------------

pub fn list_containers(context: &str) -> Result<Vec<Container>, String> {
    // Explicit template avoids the slow size computation `{{json .}}` triggers.
    let format = r#"{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}"}"#;
    let stdout = run_docker_ok(
        Some(context),
        &["ps", "-a", "--no-trunc", "--format", format],
        LIST_TIMEOUT,
    )?;
    Ok(parse_ndjson(&stdout)
        .iter()
        .map(|v| {
            let state = str_field(v, "state");
            Container {
                id: shorten(&str_field(v, "id")),
                name: str_field(v, "name"),
                image: str_field(v, "image"),
                running: state == "running",
                state,
                status: str_field(v, "status"),
                ports: str_field(v, "ports"),
            }
        })
        .filter(|c| !c.id.is_empty())
        .collect())
}

pub fn list_images(context: &str) -> Result<Vec<Image>, String> {
    let stdout = run_docker_ok(
        Some(context),
        &["image", "ls", "--format", "{{json .}}"],
        LIST_TIMEOUT,
    )?;
    Ok(parse_ndjson(&stdout)
        .iter()
        .map(|v| {
            let repository = str_field(v, "Repository");
            let tag = str_field(v, "Tag");
            let containers = num_field(v, "Containers");
            Image {
                id: shorten(&str_field(v, "ID")),
                dangling: repository == "<none>" || tag == "<none>",
                in_use: containers > 0,
                repository,
                tag,
                size: str_field(v, "Size"),
                created: str_field(v, "CreatedSince"),
                containers,
            }
        })
        .filter(|i| !i.id.is_empty())
        .collect())
}

pub fn list_volumes(context: &str) -> Result<Vec<Volume>, String> {
    // `volume ls` has no size; the verbose df is the only source of per-volume
    // size + link count, so we read the "Volumes" section of that payload.
    let stdout = run_docker_ok(
        Some(context),
        &["system", "df", "-v", "--format", "{{json .}}"],
        LIST_TIMEOUT,
    )?;
    let root: Value = serde_json::from_str(stdout.trim())
        .map_err(|e| format!("could not parse docker system df output: {e}"))?;
    let volumes = root.get("Volumes").and_then(Value::as_array).cloned().unwrap_or_default();
    Ok(volumes
        .iter()
        .map(|v| {
            let links = num_field(v, "Links");
            Volume {
                name: str_field(v, "Name"),
                driver: str_field(v, "Driver"),
                size: str_field(v, "Size"),
                in_use: links > 0,
                links,
            }
        })
        .filter(|v| !v.name.is_empty())
        .collect())
}

pub fn list_networks(context: &str) -> Result<Vec<Network>, String> {
    let stdout = run_docker_ok(
        Some(context),
        &["network", "ls", "--format", "{{json .}}"],
        LIST_TIMEOUT,
    )?;
    Ok(parse_ndjson(&stdout)
        .iter()
        .map(|v| {
            let name = str_field(v, "Name");
            Network {
                predefined: matches!(name.as_str(), "bridge" | "host" | "none"),
                id: shorten(&str_field(v, "ID")),
                name,
                driver: str_field(v, "Driver"),
                scope: str_field(v, "Scope"),
            }
        })
        .filter(|n| !n.id.is_empty())
        .collect())
}

pub fn disk_usage(context: &str) -> Result<Vec<DiskCategory>, String> {
    let stdout = run_docker_ok(
        Some(context),
        &["system", "df", "--format", "{{json .}}"],
        LIST_TIMEOUT,
    )?;
    Ok(parse_ndjson(&stdout)
        .iter()
        .filter_map(|v| {
            let type_name = str_field(v, "Type");
            let key = match type_name.as_str() {
                "Images" => "images",
                "Containers" => "containers",
                "Local Volumes" => "volumes",
                "Build Cache" => "build-cache",
                _ => return None,
            };
            let reclaimable = str_field(v, "Reclaimable");
            Some(DiskCategory {
                key: key.to_string(),
                label: type_name,
                size: str_field(v, "Size"),
                reclaimable_bytes: !starts_with_zero(&reclaimable),
                reclaimable,
                total_count: num_field(v, "TotalCount"),
                active: num_field(v, "Active"),
            })
        })
        .collect())
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

pub fn container_action(context: &str, id: &str, action: &str) -> Result<(), String> {
    let args: Vec<&str> = match action {
        "start" => vec!["start", id],
        "stop" => vec!["stop", id],
        "restart" => vec!["restart", id],
        "remove" => vec!["rm", "-f", id],
        other => return Err(format!("unknown container action: {other}")),
    };
    run_docker_ok(Some(context), &args, MUTATE_TIMEOUT)?;
    Ok(())
}

pub fn remove_image(context: &str, id: &str) -> Result<(), String> {
    run_docker_ok(Some(context), &["rmi", id], MUTATE_TIMEOUT)?;
    Ok(())
}

pub fn remove_volume(context: &str, name: &str) -> Result<(), String> {
    run_docker_ok(Some(context), &["volume", "rm", name], MUTATE_TIMEOUT)?;
    Ok(())
}

pub fn remove_network(context: &str, id: &str) -> Result<(), String> {
    run_docker_ok(Some(context), &["network", "rm", id], MUTATE_TIMEOUT)?;
    Ok(())
}

/// Prune a category. Returns the CLI's human-readable "reclaimed space" line.
pub fn prune(context: &str, target: &str) -> Result<String, String> {
    let args: Vec<&str> = match target {
        "containers" => vec!["container", "prune", "-f"],
        // `-a` so we reclaim what `system df` reports (all unused, not just dangling).
        "images" => vec!["image", "prune", "-a", "-f"],
        "volumes" => vec!["volume", "prune", "-a", "-f"],
        "networks" => vec!["network", "prune", "-f"],
        "build-cache" => vec!["builder", "prune", "-f"],
        "system" => vec!["system", "prune", "-a", "-f"],
        other => return Err(format!("unknown prune target: {other}")),
    };
    let out = run_docker_ok(Some(context), &args, MUTATE_TIMEOUT)?;
    let reclaimed = out
        .lines()
        .rev()
        .find(|l| l.to_lowercase().contains("reclaimed"))
        .unwrap_or("Prune complete")
        .trim()
        .to_string();
    Ok(reclaimed)
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

/// Docker IDs are already short with our formats, but `--no-trunc` yields the
/// long form for containers; keep a 12-char display id like the CLI default.
fn shorten(id: &str) -> String {
    let id = id.strip_prefix("sha256:").unwrap_or(id);
    id.chars().take(12).collect()
}

/// True when a reclaimable string represents zero (e.g. `"0B"`, `"0B (0%)"`).
fn starts_with_zero(reclaimable: &str) -> bool {
    let trimmed = reclaimable.trim_start();
    trimmed.is_empty() || trimmed.starts_with("0B") || trimmed.starts_with("0 B")
}
