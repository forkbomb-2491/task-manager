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
        + "/history2.db"; // CHANGE FOR RELEASE VERSIONS
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

#[derive(PartialEq, Debug, Clone)]
enum SmartDueError {
    SqlError,
    NoRecords,
    NoPairs,
    StdevTooHigh,
}

impl Into<i32> for SmartDueError {
    fn into(self) -> i32 {
        match self {
            Self::SqlError => 0,
            Self::NoRecords => 1,
            Self::NoPairs => 2,
            Self::StdevTooHigh => 3
        }
    }
}

impl PartialOrd for SmartDueError {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        // if is 5, other 10, return less
        let lhs: i32 = (*self).clone().into();
        let rhs: i32 = (*other).clone().into();
        lhs.partial_cmp(&rhs)
    }
}

async fn process_filter(filtered: Option<Vec<DueEvent>>) -> Result<i32, SmartDueError> {
    if filtered.is_none() {
        return Err(SmartDueError::NoRecords);
    } else if filtered.as_ref().unwrap().len() == 0 {
        // return Err("No due date event records found.".to_string());
        return Err(SmartDueError::NoRecords);
    }
    let filtered = filtered.unwrap();
    // Iterate through values from db & store the due date & completion date
    let mut tasks: HashMap<String, CreateCompletePair> = HashMap::new();
    for val in filtered {
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
        // return Err("No due date event create/complete pairs found.".to_string());
        return Err(SmartDueError::NoPairs);
    }
    let mean: i64 = sum / count as i64;
    let mut stdev: i64 = 0;
    for d in &deltas {
        stdev += (d - mean).pow(2);
    }
    stdev /= deltas.len() as i64;
    let stdev: f64 = (stdev as f64).sqrt();
    if stdev > MAX_STDEV_FOR_DUE_OFFSET as f64 {
        // return Err("Standard deviation too high.".to_string());
        return Err(SmartDueError::StdevTooHigh);
    }

    Ok(mean as i32)
} 

async fn get_due_offset_all_filters(
    size: i32,
    importance: i32,
    list: String,
) -> Result<i32, SmartDueError> {
    unsafe {
        let filtered = HISTORY
            .as_mut()
            .unwrap()
            .filter_due_events(Vec::from([
                format!("size={size}"),
                format!("importance={importance}"),
                format!("list='{list}'"),
            ]))
            .await;
        if filtered.is_err() {
            return Err(SmartDueError::SqlError);
        }
        return process_filter(filtered.unwrap()).await;
    }
}

async fn get_due_offset_size_importance(
    size: i32,
    importance: i32,
) -> Result<i32, SmartDueError> {
    unsafe {
        let filtered = HISTORY
            .as_mut()
            .unwrap()
            .filter_due_events(Vec::from([
                format!("size={size}"),
                format!("importance={importance}"),
            ]))
            .await;
        if filtered.is_err() {
            return Err(SmartDueError::SqlError);
        }
        return process_filter(filtered.unwrap()).await;
    }
}

async fn get_due_offset_size_list(
    size: i32,
    list: String,
) -> Result<i32, SmartDueError> {
    unsafe {
        let filtered = HISTORY
            .as_mut()
            .unwrap()
            .filter_due_events(Vec::from([
                format!("size={size}"),
                format!("list='{list}'"),
            ]))
            .await;
        if filtered.is_err() {
            return Err(SmartDueError::SqlError);
        }
        return process_filter(filtered.unwrap()).await;
    }
}

async fn get_due_offset_size(
    size: i32,
) -> Result<i32, SmartDueError> {
    unsafe {
        let filtered = HISTORY
            .as_mut()
            .unwrap()
            .filter_due_events(Vec::from([
                format!("size={size}"),
            ]))
            .await;
        if filtered.is_err() {
            return Err(SmartDueError::SqlError);
        }
        return process_filter(filtered.unwrap()).await;
    }
}

#[tauri::command]
pub async fn get_suggested_due_offset(
    size: i32,
    importance: i32,
    list: String,
) -> Result<i32, String> {
    let all_result = get_due_offset_all_filters(size, importance, list.clone()).await;
    if all_result.is_ok() {
        println!("All filters found match");
        return Ok(all_result.unwrap());
    }

    let size_list_result = get_due_offset_size_list(size, list.clone()).await;
    if size_list_result.is_ok() {
        println!("Fallback: Size & list filters found match");
        return Ok(size_list_result.unwrap());
    }

    let size_importance_result = get_due_offset_size_importance(size, importance).await;
    if size_importance_result.is_ok() {
        println!("Fallback 2: Size & importance filters found match");
        return Ok(size_importance_result.unwrap());
    }

    let size_result = get_due_offset_size(size).await;
    if size_result.is_ok() {
        println!("Fallback 3: Size filters found match");
        return Ok(size_result.unwrap());
    }

    let all_result = all_result.unwrap_err();
    let size_list_result = size_list_result.unwrap_err();
    let size_importance_result = size_importance_result.unwrap_err();
    let size_result = size_result.unwrap_err();

    let mut max = &all_result;
    if &size_list_result > max {
        max = &size_list_result;
    }
    if &size_importance_result > max {
        max = &size_importance_result;
    }
    if &size_result > max {
        max = &size_result;
    }

    match max.to_owned() {
        SmartDueError::SqlError => Err("Error returned from database".to_string()),
        SmartDueError::NoRecords => Err("No due date event records found.".to_string()),
        SmartDueError::NoPairs => Err("No due date event create/complete pairs found.".to_string()),
        SmartDueError::StdevTooHigh => Err("Standard deviation too high.".to_string()),
    }
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
