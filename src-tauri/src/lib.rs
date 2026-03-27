mod commands;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

fn register_shortcut_inner(app: &tauri::AppHandle, shortcut_str: &str) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    if shortcut_str.is_empty() {
        return Ok(());
    }

    let sc: Shortcut = shortcut_str.parse().map_err(|e| format!("{e}"))?;
    let app_handle = app.clone();
    gs.on_shortcut(sc, move |_app, _shortcut, _event| {
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        let _ = app_handle.emit("show-command-palette", ());
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn register_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    register_shortcut_inner(&app, &shortcut)
}

#[tauri::command]
fn unregister_all_shortcuts(app: tauri::AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Enable back/forward navigation gestures on macOS
            #[cfg(target_os = "macos")]
            {
                if let Some(webview) = app.get_webview_window("main") {
                    let _ = webview.with_webview(|wv| {
                        use objc2::msg_send;
                        use objc2::runtime::AnyObject;
                        unsafe {
                            let wk: *const AnyObject = wv.inner().cast();
                            let _: () = msg_send![wk, setAllowsBackForwardNavigationGestures: true];
                        }
                    });
                }
            }

            // Register global shortcut from config
            if let Ok(config) = commands::load_config() {
                if let Some(shortcut_str) = &config.global_shortcut {
                    let _ = register_shortcut_inner(app.handle(), shortcut_str);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_config,
            commands::save_config,
            commands::launch_app,
            commands::open_url,
            commands::export_config,
            commands::import_config,
            commands::list_installed_apps,
            commands::get_config_path,
            commands::list_config_profiles,
            commands::switch_config,
            commands::load_config_from_file,
            register_shortcut,
            unregister_all_shortcuts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
