use crate::{testutils::get_due_event, utils::now};

use crate::task::*;

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
