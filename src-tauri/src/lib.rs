mod commands;
mod docker;
mod platform;
mod tray;
mod widget;

use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            tray::build(app.handle())?;
            Ok(())
        })
        // Closing the window minimizes the app to the menu bar instead of quitting.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    tray::hide_window(window.app_handle());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_contexts,
            commands::local_engine_status,
            commands::switch_context,
            commands::create_ssh_context,
            commands::list_containers,
            commands::list_images,
            commands::list_volumes,
            commands::list_networks,
            commands::disk_usage,
            commands::container_action,
            commands::remove_image,
            commands::remove_volume,
            commands::remove_network,
            commands::prune,
            commands::publish_widget_snapshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
