//! IPC commands exposed to the WebView — thin wrappers over [`crate::docker`].
//!
//! Command names must stay in sync with `src/lib/backend.ts`. Everything that
//! can talk to a daemon takes a `context` argument so the resource views act on
//! the context the user is inspecting, never on ambient global state.

use crate::docker::{
    self, Container, DiskCategory, DockerContext, EngineStatus, Image, Network, NewSshContext,
    Volume,
};

#[tauri::command]
pub fn list_contexts() -> Result<Vec<DockerContext>, String> {
    docker::list_contexts()
}

#[tauri::command]
pub fn local_engine_status() -> Result<EngineStatus, String> {
    docker::local_engine_status()
}

#[tauri::command]
pub fn switch_context(name: String) -> Result<(), String> {
    docker::switch_context(&name)
}

#[tauri::command]
pub fn create_ssh_context(spec: NewSshContext) -> Result<DockerContext, String> {
    docker::create_ssh_context(&spec)
}

#[tauri::command]
pub fn list_containers(context: String) -> Result<Vec<Container>, String> {
    docker::list_containers(&context)
}

#[tauri::command]
pub fn list_images(context: String) -> Result<Vec<Image>, String> {
    docker::list_images(&context)
}

#[tauri::command]
pub fn list_volumes(context: String) -> Result<Vec<Volume>, String> {
    docker::list_volumes(&context)
}

#[tauri::command]
pub fn list_networks(context: String) -> Result<Vec<Network>, String> {
    docker::list_networks(&context)
}

#[tauri::command]
pub fn disk_usage(context: String) -> Result<Vec<DiskCategory>, String> {
    docker::disk_usage(&context)
}

#[tauri::command]
pub fn container_action(context: String, id: String, action: String) -> Result<(), String> {
    docker::container_action(&context, &id, &action)
}

#[tauri::command]
pub fn remove_image(context: String, id: String) -> Result<(), String> {
    docker::remove_image(&context, &id)
}

#[tauri::command]
pub fn remove_volume(context: String, name: String) -> Result<(), String> {
    docker::remove_volume(&context, &name)
}

#[tauri::command]
pub fn remove_network(context: String, id: String) -> Result<(), String> {
    docker::remove_network(&context, &id)
}

#[tauri::command]
pub fn prune(context: String, target: String) -> Result<String, String> {
    docker::prune(&context, &target)
}
