mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
