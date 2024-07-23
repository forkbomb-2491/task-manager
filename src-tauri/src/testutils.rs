use std::time::{SystemTime, UNIX_EPOCH};

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
