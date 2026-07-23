//! OS abstraction seams + the single `docker` execution primitive.
//!
//! Every OS-specific behaviour lives here so that adding Windows/Linux
//! support later is a matter of extending these helpers rather than hunting
//! `cfg!` branches across the codebase.
//!
//! All process execution goes through [`run_docker`], which:
//! - passes arguments as a vector (never a shell string) so user-supplied
//!   context names / hosts / ids can't inject commands;
//! - resolves the `docker` binary explicitly, because GUI-launched macOS apps
//!   inherit a minimal PATH that usually omits `/usr/local/bin`,
//!   `/opt/homebrew/bin`, OrbStack, and Docker Desktop;
//! - enforces a timeout, so an unreachable SSH context surfaces an error
//!   instead of hanging the window forever.

use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;

use wait_timeout::ChildExt;

/// Name of the Docker CLI binary on this OS.
fn docker_binary_name() -> &'static str {
    if cfg!(windows) {
        "docker.exe"
    } else {
        "docker"
    }
}

/// Fallback engine endpoint when no context-specific endpoint is known.
pub fn default_local_socket() -> &'static str {
    if cfg!(windows) {
        "npipe:////./pipe/docker_engine"
    } else {
        "unix:///var/run/docker.sock"
    }
}

/// Directories a GUI app may need to search beyond the inherited PATH.
#[cfg(not(windows))]
fn extra_binary_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/Applications/Docker.app/Contents/Resources/bin"),
    ];
    if let Some(home) = std::env::var_os("HOME") {
        let home = PathBuf::from(home);
        dirs.push(home.join(".docker/bin"));
        dirs.push(home.join(".orbstack/bin"));
        dirs.push(home.join(".rd/bin")); // Rancher Desktop
    }
    dirs
}

#[cfg(windows)]
fn extra_binary_dirs() -> Vec<PathBuf> {
    vec![PathBuf::from(
        r"C:\Program Files\Docker\Docker\resources\bin",
    )]
}

/// Locate the `docker` binary once and cache the result.
pub fn docker_path() -> Option<&'static PathBuf> {
    static PATH: OnceLock<Option<PathBuf>> = OnceLock::new();
    PATH.get_or_init(resolve_docker).as_ref()
}

fn resolve_docker() -> Option<PathBuf> {
    let name = docker_binary_name();

    // 1. Honour the inherited PATH first (respects user overrides).
    if let Some(path) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path) {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    // 2. Fall back to well-known install locations.
    for dir in extra_binary_dirs() {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    None
}

/// Outcome of a `docker` invocation.
pub struct DockerRun {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

/// Run `docker [--context <ctx>] <args...>` with a hard timeout.
///
/// `context` scopes the command to a specific Docker context via `--context`,
/// leaving the user's globally-selected context untouched (except, of course,
/// for `context use` itself, which is invoked with `context: None`).
pub fn run_docker(
    context: Option<&str>,
    args: &[&str],
    timeout: Duration,
) -> Result<DockerRun, String> {
    let binary = docker_path().ok_or_else(|| "docker CLI not found".to_string())?;

    let mut command = Command::new(binary);
    if let Some(ctx) = context {
        command.arg("--context").arg(ctx);
    }
    command.args(args);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());
    // Never let the CLI block on an interactive prompt (e.g. a prune confirm).
    command.stdin(Stdio::null());

    let mut child = command
        .spawn()
        .map_err(|e| format!("failed to launch docker: {e}"))?;

    // Drain both pipes on dedicated threads so a large payload can't fill the
    // OS pipe buffer and deadlock while we wait on the process.
    let mut out_pipe = child.stdout.take().expect("stdout piped");
    let mut err_pipe = child.stderr.take().expect("stderr piped");
    let out_handle = thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = out_pipe.read_to_end(&mut buf);
        buf
    });
    let err_handle = thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = err_pipe.read_to_end(&mut buf);
        buf
    });

    match child.wait_timeout(timeout) {
        Ok(Some(status)) => {
            let stdout = String::from_utf8_lossy(&out_handle.join().unwrap_or_default())
                .trim()
                .to_string();
            let stderr = String::from_utf8_lossy(&err_handle.join().unwrap_or_default())
                .trim()
                .to_string();
            Ok(DockerRun {
                stdout,
                stderr,
                success: status.success(),
            })
        }
        Ok(None) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(format!(
                "docker timed out after {}s (context unreachable?)",
                timeout.as_secs()
            ))
        }
        Err(e) => Err(format!("failed while waiting on docker: {e}")),
    }
}

/// Convenience wrapper that returns trimmed stdout, mapping a non-zero exit to
/// an `Err` carrying stderr (falling back to stdout when stderr is empty).
pub fn run_docker_ok(
    context: Option<&str>,
    args: &[&str],
    timeout: Duration,
) -> Result<String, String> {
    let run = run_docker(context, args, timeout)?;
    if run.success {
        Ok(run.stdout)
    } else {
        let message = if run.stderr.is_empty() {
            run.stdout
        } else {
            run.stderr
        };
        Err(clean_error(&message))
    }
}

/// Strip Docker's noisy prefixes so the UI can show a tidy one-liner.
fn clean_error(message: &str) -> String {
    let line = message
        .lines()
        .find(|l| !l.trim().is_empty())
        .unwrap_or(message)
        .trim();
    line.strip_prefix("Error response from daemon: ")
        .or_else(|| line.strip_prefix("Error: "))
        .unwrap_or(line)
        .to_string()
}
