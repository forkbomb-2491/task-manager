use std::collections::HashMap;

use tauri::{async_runtime::block_on, Event, Listener, Manager, Runtime};

use crate::{history::History, utils::now};

static mut HISTORY: Option<History> = None;

unsafe fn init_history() {
    if HISTORY.is_none() {
        HISTORY = Some(History::new());
    }
}

fn close_history(_e: Event) {
    unsafe {
        if HISTORY.is_some() {
            block_on(HISTORY.as_mut().unwrap().close());
        }
    }
}

#[derive(PartialEq)]
pub enum DueEventType {
    Create,
    Complete,
}

impl TryFrom<i32> for DueEventType {
    type Error = String;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Complete),
            1 => Ok(Self::Create),
            _ => Err(format!("Invalid value '{value}' for DueEventType.")),
        }
    }
}

#[derive(sqlx::FromRow)]
pub struct DueEvent {
    #[sqlx(try_from = "i32")]
    #[sqlx(rename = "type")]
    pub event_type: DueEventType,
    #[sqlx(rename = "time")]
    pub timestamp: i64,
    pub id: String,
    pub list: String, // Until lists are implemented, this is category/color
    pub importance: i32,
    pub size: i32,
    pub due: i64,
}

async fn record_due_event(
    event_type: DueEventType,
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64,
) -> Result<(), String> {
    let event = DueEvent {
        event_type: event_type,
        timestamp: now(),
        id: id,
        list: color,
        importance: importance,
        size: size,
        due: due,
    };
    unsafe { HISTORY.as_mut().unwrap().insert_due_event(event).await }
}

#[tauri::command]
pub async fn record_create_event(
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64,
) -> Result<(), String> {
    record_due_event(DueEventType::Create, id, color, importance, size, due).await
}

#[tauri::command]
pub async fn record_complete_event(
    id: String,
    color: String,
    importance: i32,
    size: i32,
    due: i64,
) -> Result<(), String> {
    record_due_event(DueEventType::Complete, id, color, importance, size, due).await
}

#[tauri::command]
pub async fn init_algo<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .unwrap()
        .to_str()
        .expect("AppData failed to resolve")
        .to_owned()
        + "/history2.db";
    unsafe {
        init_history();
        let hist = HISTORY.as_mut().unwrap();
        hist.load(&path)
            .await
            .expect("Issue loading history database.");
        app.listen_any("exit-requested", close_history);
    }
    Ok(())
}

struct CreateCompletePair {
    pub created: Option<i64>,
    pub completed: Option<i64>,
}

impl CreateCompletePair {
    pub fn new() -> CreateCompletePair {
        return CreateCompletePair {
            created: None,
            completed: None,
        };
    }
}

const MAX_STDEV_FOR_DUE_OFFSET: i32 = 86_400_000 * 3;

#[tauri::command]
pub async fn get_suggested_due_offset(
    size: i32,
    importance: i32,
    list: String,
) -> Result<i32, String> {
    // Get due events from db
    let values: Vec<DueEvent>;
    unsafe {
        let filtered = HISTORY
            .as_mut()
            .unwrap()
            .filter_due_events(Vec::from([
                format!("size={size}"),
                format!("importance={importance}"),
                format!("list='{list}'"),
            ]))
            .await
            .expect("Error filtering events.");
        if filtered.is_none() {
            return Err("No due date event records found.".to_string());
        } else if filtered.as_ref().unwrap().len() == 0 {
            return Err("No due date event records found.".to_string());
        }
        values = filtered.unwrap();
    }
    // Iterate through values from db & store the due date & completion date
    let mut tasks: HashMap<String, CreateCompletePair> = HashMap::new();
    for val in values {
        let id = val.id.clone();
        if !tasks.contains_key(&id) {
            tasks.insert(id.clone(), CreateCompletePair::new());
        }

        if val.event_type == DueEventType::Create {
            let entry = tasks.get_mut(&id.clone()).unwrap();
            entry.created = Some(val.due);
        } else {
            let entry = tasks.get_mut(&id.clone()).unwrap();
            entry.completed = Some(val.timestamp);
        }
    }
    // Compute deltas
    let mut deltas: Vec<i64> = Vec::new();
    for task in tasks {
        if task.1.completed.is_none() || task.1.created.is_none() {
            continue;
        }
        deltas.push(task.1.completed.unwrap() - task.1.created.unwrap());
    }

    let sum: i64 = deltas.iter().sum();
    let count = deltas.len();
    if count == 0 {
        return Err("No due date event create/complete pairs found.".to_string());
    }
    let mean: i64 = sum / count as i64;
    let mut stdev: i64 = 0;
    for d in &deltas {
        stdev += (d - mean).pow(2);
    }
    stdev /= deltas.len() as i64;
    let stdev: f64 = (stdev as f64).sqrt();
    if stdev > MAX_STDEV_FOR_DUE_OFFSET as f64 {
        return Err("Standard deviation too high.".to_string());
    }

    Ok(mean as i32)
}

#[tauri::command]
pub async fn clear_due_events() -> Result<(), String> {
    unsafe {
        Ok(HISTORY
            .as_mut()
            .unwrap()
            .clear_due_events(Vec::new())
            .await?)
    }
}

#[tauri::command]
pub async fn remove_due_event(id: String, create: bool, complete: bool) -> Result<(), String> {
    let mut conditions: Vec<String> = Vec::new();
    conditions.push(format!("id='{}'", id));
    if !create && !complete {
        return Err("Choose either create or complete to delete".to_string());
    } else if create && !complete {
        conditions.push(format!("type=0"));
    } else if !create && complete {
        conditions.push(format!("type=1"));
    }
    unsafe {
        Ok(HISTORY
            .as_mut()
            .unwrap()
            .clear_due_events(conditions)
            .await?)
    }
}
