//! macOS menu-bar (system tray) integration.
//!
//! The app behaves like a native menu-bar utility: closing the window hides it
//! to the menu bar instead of quitting (and drops the dock icon so only the
//! menu-bar item remains). Left-clicking the tray icon toggles the window;
//! right-clicking opens a Show / Hide / Quit menu.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

const MAIN_WINDOW: &str = "main";

/// Build the tray icon + menu. Called once from `setup`.
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Docker Switcher", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide to Menu Bar", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &separator, &quit])?;

    // A black-on-transparent template icon; macOS tints it for the menu bar.
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;

    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Docker Context Switcher")
        .menu(&menu)
        // Left-click is reserved for toggling the window (handled below).
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_window(app),
            "hide" => hide_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Reveal the window and restore the app to a normal (dock-visible) app.
pub fn show_window<R: Runtime>(app: &AppHandle<R>) {
    #[cfg(target_os = "macos")]
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Hide the window and drop the dock icon, leaving only the menu-bar item.
pub fn hide_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.hide();
    }
    #[cfg(target_os = "macos")]
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    let visible = app
        .get_webview_window(MAIN_WINDOW)
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false);
    if visible {
        hide_window(app);
    } else {
        show_window(app);
    }
}
