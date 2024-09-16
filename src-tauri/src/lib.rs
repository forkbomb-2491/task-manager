// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};

mod algorithm;
mod history;
mod testutils;
mod task;
mod storage;
mod utils;
mod http;

mod tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
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
            algorithm::remove_due_event,
            task::migrate_tasks,
            task::load_tasks,
            task::add_list,
            task::edit_list,
            task::delete_list,
            task::add_task,
            task::edit_task,
            task::delete_task,
            http::log_in,
            http::is_logged_in,
            http::send_telemetry,
            http::do_sync,
            http::log_out,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");
    http::set_app_conf_dir(app.path().app_data_dir().unwrap().to_str().unwrap().to_string());
    app.run(|handle, event| match event {
        tauri::RunEvent::ExitRequested { .. } => {
            let _ = handle.emit("exit-requested", ());
        },
        _ => {},
    })
}
