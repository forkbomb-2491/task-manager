use std::time::{SystemTime, UNIX_EPOCH};
use std::{collections::HashMap, fs, path::PathBuf, sync::Mutex};
use tauri::{path::PathResolver, Runtime};
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
        Value::Number(num) => {
            if num.is_f64() {
                Some(num.as_f64().ok_or(de::Error::custom(format!("Invalid number {}", num)))? as i64)
            } else {
                Some(num.as_i64().ok_or(de::Error::custom(format!("Invalid number {}", num)))? as i64)
            }
        },
        Value::Null => None,
        _ => return Err(de::Error::custom("wrong type"))
    })
}

pub fn get_data_dir<R: Runtime>(path_resolver: &PathResolver<R>) -> Result<String, String> {
    let data_dir = path_resolver
        .data_dir()
        .map_err(|_| "Failed to resolve data path.".to_owned())?
        .join("dev.pgil.forkbomb.taskmgr");
        // .join("Task Manager 2491");
    Ok(check_app_data_exists(data_dir))
}

fn check_app_data_exists(path: PathBuf) -> String {
    if !path.exists() {
        let _ = fs::create_dir(path.clone());
    }
    path.to_str().unwrap().to_owned()
}