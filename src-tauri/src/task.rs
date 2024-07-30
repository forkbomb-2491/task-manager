use std::{collections::HashMap, ops::Deref};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
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
    fn from_entry(entry: &TaskEntry) -> TaskRecord {
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

fn load_records(entries: &Vec<TaskEntry>) -> Vec<TaskRecord> {
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

#[derive(sqlx::FromRow)]
pub struct TaskEntry {
    pub name: String,
    pub size: i32,
    pub importance: i32,
    pub list: String,
    pub due: i64,
    pub completed: bool,
    pub id: String,
    pub parent: Option<String>,
    pub last_edited: Option<i64>,
    pub created: Option<i64>
}

#[derive(Serialize, Deserialize)]
pub struct ListRecord {
    pub name: String,
    pub uuid: String,
    pub color: i32,
    pub tasks: Vec<TaskRecord>
}

#[derive(sqlx::FromRow)]
pub struct ListEntry {
    pub name: String,
    pub uuid: String,
    pub color: i32,
    pub last_edited: Option<i64>,
    pub created: Option<i64>
}

#[cfg(test)]
#[allow(unused)]
mod tests {
    // NOTE: These tests MUST be run with the --test-threads=1 argument
    use crate::{testutils::get_due_event, utils::now};

    use super::*;

    #[test]
    fn test_from_entry() {
        let entry = TaskEntry {
            name: "test".to_owned(),
            size: 4,
            importance: 2,
            list: "test".to_owned(),
            due: now(),
            completed: false,
            id: "123456".to_owned(),
            parent: None,
            last_edited: Some(now()),
            created: Some(now()),
        };
        let record = TaskRecord::from_entry(&entry);
        assert_eq!(record.name, entry.name);
        assert_eq!(record.size, entry.size);
        assert_eq!(record.importance, entry.importance);
        assert_eq!(record.due, entry.due);
        assert_eq!(record.completed, entry.completed);
        assert_eq!(record.id, entry.id);
    }

    #[test]
    fn test_from_entries_basic() {
        let entries = Vec::from([
            TaskEntry {
                name: "test".to_owned(),
                size: 4,
                importance: 2,
                list: "test".to_owned(),
                due: now(),
                completed: false,
                id: "123456".to_owned(),
                parent: None,
                last_edited: Some(now()),
                created: Some(now()),
            },
            TaskEntry {
                name: "test2".to_owned(),
                size: 4,
                importance: 2,
                list: "test".to_owned(),
                due: now(),
                completed: false,
                id: "123466".to_owned(),
                parent: None,
                last_edited: Some(now()),
                created: Some(now()),
            },
            TaskEntry {
                name: "test3".to_owned(),
                size: 4,
                importance: 2,
                list: "test".to_owned(),
                due: now(),
                completed: false,
                id: "123465".to_owned(),
                parent: Some("123456".to_owned()),
                last_edited: Some(now()),
                created: Some(now()),
            },
        ]);
        let records = load_records(&entries);
        assert!(records.len() == 2);
        for r in &records {
            if r.id == "123456" {
                assert!(r.subtasks.len() == 1);
            } else {
                assert!(r.subtasks.len() == 0);
            }
        }
        // print!("{}", serde_json::to_string(&records).unwrap());
    }
}