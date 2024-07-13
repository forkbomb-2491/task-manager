use tauri::Runtime;



enum DueEventType {
    Create,
    Complete
}

#[derive(sqlx::FromRow)]
struct DueEvent {

}

#[tauri::command]
pub async fn record_due_event<R: Runtime>(
    app: tauri::AppHandle<R>, 
    window: tauri::Window<R>,
    event: DueEventType,
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64
) -> Result<(), String> {
    Ok(())
}