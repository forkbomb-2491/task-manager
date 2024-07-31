use std::{fs, time::{SystemTime, UNIX_EPOCH}};

use crate::algorithm::{DueEvent, DueEventType};

#[allow(dead_code)]
pub fn get_due_event() -> DueEvent {
    DueEvent {
        event_type: DueEventType::Complete,
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64,
        id: "123456".to_string(),
        list: "test".to_string(),
        importance: 3,
        size: 2,
        due: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Timestamp issue in Rust (TS is before epoch)")
            .as_millis() as i64,
    }
}

#[allow(unused)]
pub fn delete_test_db() {
    let _ = fs::remove_file("testDb.db").or_else(|e| {
        println!("{e}");
        Err(e)
    });
    let _ = fs::remove_file("testDb.db-shm").or_else(|e| {
        println!("{e}");
        Err(e)
    });
    let _ = fs::remove_file("testDb.db-wal").or_else(|e| {
        println!("{e}");
        Err(e)
    });
}