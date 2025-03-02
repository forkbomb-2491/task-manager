use std::collections::HashMap;
use std::fs::{exists, read_to_string};
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs, path::PathBuf};
use tauri::{path::PathResolver, Runtime};
use serde::{Deserializer, de, Deserialize};
use serde_json::{from_str, Value};

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

pub fn get_database_dir<R: Runtime>(path_resolver: &PathResolver<R>) -> Result<String, String> {
    let data_dir = get_data_dir(path_resolver)?;
    let settings = read_to_string(data_dir.clone() + "/settings2.json");
    if !settings.is_ok() {
        // ONLY PANIC DURING DEBUGGING
        panic!("No settings.json found!");
        // // Prod: failsoft
        // return Ok(data_dir);
    }
    let settings_json: HashMap<String, Value> = from_str(&settings.unwrap()).unwrap();
    let custom_path = settings_json.get("customDatabaseDir");
    if custom_path.is_none() || custom_path.is_some_and(|val| !val.is_string()) {
        println!("Custom database directory not string/found.");
        return Ok(data_dir);
    }
    let custom_path = custom_path.unwrap().as_str().unwrap();
    if !exists(custom_path).unwrap() {
        println!("Custom database directory invalid.");
        return Ok(data_dir);
    }
    Ok(custom_path.to_owned())
}

fn check_app_data_exists(path: PathBuf) -> String {
    if !path.exists() {
        let _ = fs::create_dir(path.clone());
    }
    path.to_str().unwrap().to_owned()
}