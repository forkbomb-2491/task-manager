// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod algorithm;
mod history;
mod testutils;
mod task;
mod storage;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        // .manage(history::History::new())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            algorithm::init_algo,
            algorithm::record_create_event,
            algorithm::record_complete_event,
            algorithm::get_suggested_due_offset,
            algorithm::clear_due_events,
            algorithm::remove_due_event
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
