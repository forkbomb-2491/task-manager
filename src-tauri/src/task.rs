use std::{collections::HashMap};

use serde::{Deserialize, Serialize};
use tauri::{async_runtime::block_on, AppHandle, Event, Listener, Manager, Runtime};

use crate::{storage::TaskDb, utils::{de_float_guard, now}};

static TASKS_PATH: &str = "/tasks.db"; // Prod
// static TASKS_PATH: &str = "/tasks2.db"; // Testing/debug

#[derive(Serialize, Deserialize, Clone)]
pub struct TaskRecord {
    pub name: String,
    pub size: i32,
    pub importance: i32,
    pub due: i64,
    pub completed: bool,
    pub id: String,
    pub subtasks: Vec<TaskRecord>
}

impl TaskRecord {
    pub fn from_entry(entry: &TaskEntry) -> TaskRecord {
        return TaskRecord {
            name: entry.name.to_owned(),
            size: entry.size.to_owned(),
            importance: entry.importance.to_owned(),
            due: entry.due.to_owned(),
            completed: entry.completed.to_owned(),
            id: entry.id.to_owned(),
            subtasks: Vec::new()
        }
    }

    fn from_tree(root: &SubtaskNode, entries: &HashMap<String, &TaskEntry>) -> TaskRecord {
        let mut task = TaskRecord::from_entry(entries.get(&root.id).unwrap());
        for k in &root.subtasks {
            task.subtasks.push(TaskRecord::from_tree(k.1, entries));
        }
        return task;
    }
}

struct SubtaskNode {
    id: String,
    subtasks: HashMap<String, SubtaskNode>
}

impl SubtaskNode {
    fn new(id: &str) -> SubtaskNode {
        return SubtaskNode {
            id: id.to_string(),
            subtasks: HashMap::new()
        }
    }
}

// Evil, Affront to God
pub fn load_records(entries: &Vec<TaskEntry>) -> Vec<TaskRecord> {
    let mut ret: Vec<TaskRecord> = Vec::new();
    let mut parents: HashMap<String, Option<String>> = HashMap::new();
    let mut entry_map: HashMap<String, &TaskEntry> = HashMap::new();
    // Loop 1 -- Populate Maps (god help me)
    for e in entries {
        entry_map.insert(e.id.to_owned(), e);
        parents.insert(e.id.to_owned(), e.parent.to_owned());
    }
    let mut stack: Vec<String> = Vec::new();
    let mut root: SubtaskNode = SubtaskNode::new("ROOT");
    // Loop 2 -- Populate Tree
    for e in entries {
        stack.push(e.id.to_owned());
        let mut current = &e.parent;
        while !current.is_none() {
            let to_push = current.to_owned().unwrap();
            current = &parents.get(&to_push).unwrap();
            stack.push(to_push);
        }
        let mut current = &mut root;
        while stack.len() > 0 {
            let id = stack.pop().unwrap();
            if !current.subtasks.contains_key(&id) {
                let node = SubtaskNode::new(&id);
                current.subtasks.insert(id.clone(), node);
            } 
            current = current.subtasks.get_mut(&id).unwrap();
        }
    }
    // Iterate over Tree
    for e in &root.subtasks {
        ret.push(TaskRecord::from_tree(e.1, &entry_map));
    }
    return ret;
}

#[derive(sqlx::FromRow, Clone, Debug, Deserialize, Serialize)]
pub struct TaskEntry {
    pub name: String,
    pub size: i32,
    pub importance: i32,
    pub due: i64,
    pub completed: bool,
    pub id: String,
    pub parent: Option<String>,
    #[serde(deserialize_with = "de_float_guard")]
    pub last_edited: Option<i64>,
    #[serde(deserialize_with = "de_float_guard")]
    pub created: Option<i64>
}

impl TaskEntry {
    pub fn from_record(task: &TaskRecord, parent: Option<String>) -> TaskEntry {
        TaskEntry {
            completed: task.completed,
            created: None,
            due: task.due,
            id: task.id.clone(),
            importance: task.importance,
            last_edited: None,
            name: task.name.clone(),
            parent: parent,
            size: task.size
        }
    }

    pub fn entries_from_record(task: &TaskRecord, parent: Option<String>) -> Vec<TaskEntry> {
        let mut ret = vec![TaskEntry::from_record(task, parent)];
        for st in &task.subtasks {
            ret.append(&mut TaskEntry::entries_from_record(st, Some(task.id.clone())));
        }
        return ret;
    }
}

#[derive(Serialize, Deserialize)]
pub struct ListRecord {
    pub name: String,
    pub uuid: String,
    pub color: i32,
    pub tasks: Vec<TaskRecord>
}

#[derive(sqlx::FromRow, Debug, Deserialize, Serialize, Clone)]
pub struct ListEntry {
    pub name: String,
    pub uuid: String,
    pub color: i32,
    #[serde(deserialize_with = "de_float_guard")]
    pub last_edited: Option<i64>,
    #[serde(deserialize_with = "de_float_guard")]
    pub created: Option<i64>
}

impl ListEntry {
    pub fn from_record(list: &ListRecord) -> ListEntry {
        ListEntry {
            color: list.color,
            created: None,
            last_edited: None,
            name: list.name.clone(),
            uuid: list.uuid.clone()
        }
    }
}

impl ListRecord {
    pub fn from_entry(list: &ListEntry) -> ListRecord {
        ListRecord {
            color: list.color,
            name: list.name.clone(),
            uuid: list.uuid.clone(),
            tasks: vec![]
        }
    }
}

#[tauri::command]
pub async fn migrate_tasks (
    db: tauri::State<'_, TaskDb>,
    lists: Vec<ListRecord>
) -> Result<bool, String> {
    println!("{}", &lists.len());
    for l in &lists {
        println!("{}", l.name);
        let entry = ListEntry::from_record(l);
        let res = db.new_list(&entry).await;
        if !res.is_ok() { return Err(format!("{}", res.unwrap_err())); }
        
        let mut tasks: Vec<TaskEntry> = vec![];
        for t in &l.tasks {
            tasks.append(&mut TaskEntry::entries_from_record(t, None));
        }
        for t in tasks {
            let res = db.new_task(entry.uuid.clone(), &t).await;
            if !res.is_ok() { return Err(format!("{}", res.unwrap_err())); }
        }
    }
    Ok(true)
}

#[tauri::command]
pub async fn load_tasks (
    db: tauri::State<'_, TaskDb>,
) -> Result<Vec<ListRecord>, String> {
    let mut ret: Vec<ListRecord> = Vec::new();
    // Get all lists
    let lists = db.get_lists().await;
    if lists.is_err() { return Err(format!("{}", lists.unwrap_err())); }
    let lists = lists.unwrap();
    if lists.is_none() { return Ok(ret); }
    let lists = lists.unwrap();
    // For each list
    for l in lists {
        let mut list = ListRecord::from_entry(&l);
        // Get all tasks from list
        let tasks = db.get_tasks(l.uuid.to_string()).await;
        if tasks.is_err() { return Err(format!("{}", tasks.unwrap_err())); }
        let tasks = tasks.unwrap();
        if tasks.is_some() {
            // Run thru Evil, Affront-To-God Graph Method
            list.tasks = load_records(&tasks.unwrap());
        } else {
            list.tasks = vec![];
        }
        ret.push(list);
    }
    Ok(ret)
}

#[tauri::command]
pub async fn add_list (
    db: tauri::State<'_, TaskDb>, 
    list: ListRecord
) -> Result<bool, String> {
    let list = ListEntry::from_record(&list);
    let result = db.new_list(&list).await;
    if result.is_err() {
        Err(format!("{}", result.unwrap_err()))
    } else {
        // Syncing here
        Ok(result.unwrap())
    }
}

#[tauri::command]
pub async fn edit_list (
    db: tauri::State<'_, TaskDb>, 
    list: ListRecord
) -> Result<bool, String> {
    let list = ListEntry::from_record(&list);
    let result = db.edit_list(&list).await;
    if result.is_err() {
        Err(format!("{}", result.unwrap_err()))
    } else {
        // Syncing here
        Ok(result.unwrap())
    }
}

#[tauri::command]
pub async fn delete_list (
    db: tauri::State<'_, TaskDb>, 
    list: ListRecord
) -> Result<bool, String> {
    let result = db.delete_list(list.uuid).await;
    if result.is_err() {
        Err(format!("{}", result.unwrap_err()))
    } else {
        // Syncing here
        Ok(result.unwrap())
    }
}

#[tauri::command]
pub async fn add_task (
    db: tauri::State<'_, TaskDb>, 
    task: TaskRecord, list: String, parent: Option<String>
) -> Result<bool, String> {
    let task = TaskEntry::from_record(&task, parent);
    let result = db.new_task(list, &task).await;
    if result.is_err() {
        Err(format!("{}", result.unwrap_err()))
    } else {
        // Syncing here
        Ok(result.unwrap())
    }
}

#[tauri::command]
pub async fn edit_task (
    db: tauri::State<'_, TaskDb>,
    task: TaskRecord, list: String, parent: Option<String>
) -> Result<bool, String> {
    let task = TaskEntry::from_record(&task, parent);
    let result = db.edit_task(list, &task).await;
    if result.is_err() {
        Err(format!("{}", result.unwrap_err()))
    } else {
        // Syncing here
        Ok(result.unwrap())
    }
}

#[tauri::command]
pub async fn delete_task (
    db: tauri::State<'_, TaskDb>, 
    task: TaskRecord, list: String
) -> Result<bool, String> {
    let result = db.delete_task(list, task.id).await;
    if result.is_err() {
        Err(format!("{}", result.unwrap_err()))
    } else {
        // Syncing here
        Ok(result.unwrap())
    }
}