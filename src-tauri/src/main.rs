// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::sync::Mutex;

// use tauri::State;

// mod history;

// struct History(Mutex<history::HistoryManager>);

fn main() {
    tauri::Builder::default()
        // .manage(History(Default::default()))
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        // .invoke_handler(tauri::generate_handler![history::test_db])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
