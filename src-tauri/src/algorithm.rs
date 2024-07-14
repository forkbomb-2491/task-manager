use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{Manager, Runtime};

use crate::history::History;

static mut HISTORY: Option<History> = None;

unsafe fn init_history() {
    if HISTORY.is_none() {
        HISTORY = Some(History::new());
    }
}

pub enum DueEventType {
    Create,
    Complete
}

#[derive(sqlx::FromRow)]
pub struct DueEvent {
    pub event_type: DueEventType,
    pub timestamp: i64,
    pub id: String,
    pub list: String, // Until lists are implemented, this is category/color
    pub importance: i32,
    pub size: i32,
    pub due: i64
}

async fn record_due_event(
    event_type: DueEventType,
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64
) -> Result<(), String> {
    let event = DueEvent {
        event_type: event_type,
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Timestamp issue in Rust (TS is before epoch)")
            .as_millis() as i64,
        id: id,
        list: color,
        importance: importance,
        size: size,
        due: due
    };
    unsafe { 
        HISTORY
            .as_mut()
            .unwrap()
            .insert_due_event(event)
            .await
    }
}

#[tauri::command]
pub async fn record_create_event(
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64
) -> Result<(), String> {
    record_due_event(DueEventType::Create, id, color, importance, size, due).await
}

#[tauri::command]
pub async fn record_complete_event(
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64
) -> Result<(), String> {
    record_due_event(DueEventType::Complete, id, color, importance, size, due).await
}

#[tauri::command]
pub async fn init_algo<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let path = app.path().app_data_dir().unwrap().to_str().expect("AppData failed to resolve").to_owned() + "/history.db";
    unsafe {
        init_history();
        let hist = HISTORY.as_mut().unwrap();
        hist.load(&path).await.expect("Issue loading history database.");
    }
    Ok(())
}

// pub async fn get_suggested_due_offset() -> Result<i32, String> {

// }