use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserializer, de, Deserialize};
use serde_json::Value;

pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Timestamp issue in Rust (TS is before epoch)")
        .as_millis() as i64
}

pub fn de_float_guard<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<i64>, D::Error> {
    Ok(match Value::deserialize(deserializer)? {
        Value::Number(num) => Some(num.as_i64().ok_or(de::Error::custom("Invalid number"))? as i64),
        Value::Null => None,
        _ => return Err(de::Error::custom("wrong type"))
    })
}