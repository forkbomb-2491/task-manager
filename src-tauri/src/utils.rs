use std::time::{SystemTime, UNIX_EPOCH};

pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Timestamp issue in Rust (TS is before epoch)")
        .as_millis() as i64
}