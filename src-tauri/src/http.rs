use std::{collections::HashMap, env::consts::OS, fs::read_to_string, str::FromStr, sync::Mutex};

use reqwest::{header, Error, Method, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{http::response, Runtime, Url};
use reqwest::blocking::{Client, Request, Response, RequestBuilder};

use crate::{task::{ListEntry, TaskEntry}, utils::now};

// const API_ROOT: &str = "https://api.forkbomb2491.dev";
const API_ROOT: &str = "http://localhost:5000";

static mut COOKIE: Option<SessionCooke> = None;
static mut APP_CONF_DIR: Option<String> = None;

pub fn set_app_conf_dir(path: String) {
    unsafe {
        APP_CONF_DIR = Some(path);
        println!("Dir set to {}", &APP_CONF_DIR.as_mut().unwrap())
    }
}

struct SessionCooke {
    cookie: Mutex<String>
}

impl SessionCooke {
    fn new() -> Self {
        SessionCooke { cookie: Mutex::from("".to_string()) }
    }

    fn get_cookie(&self) -> String {
        let lock = self.cookie.lock().unwrap();
        return lock.clone();
    }

    fn set_cookie(&mut self, cookie: &str) {
        let cookie = cookie.to_string();
        *self.cookie.lock().unwrap() = cookie;
    }
}

fn set_cookie(response: &Response) {
    if (*response).headers().contains_key(header::SET_COOKIE) {
        let cookie = (*response)
            .headers()
            .get(header::SET_COOKIE)
            .unwrap()
            .to_str()
            .unwrap();
        unsafe {
            if COOKIE.is_none() {
                COOKIE = Some(SessionCooke::new());
            }
            COOKIE.as_mut().unwrap().set_cookie(cookie);
        }
    }
}

fn base_request(endpoint: &str, method: Method) -> RequestBuilder {
    let mut ret = Client::new()
        .request(method, Url::from_str(
            &(API_ROOT.to_owned() + endpoint)
        ).unwrap());
    ret = ret.header(header::USER_AGENT, format!("Task-Manager/{} ({})", env!("CARGO_PKG_VERSION"), OS));
    unsafe {
        if COOKIE.is_some() {
            ret = ret.header(header::COOKIE, COOKIE.as_mut().unwrap().get_cookie());
        }
    }
    return ret;
}

#[tauri::command]
pub fn is_logged_in() -> bool {
    unsafe {
        if COOKIE.is_none() {
            return false;
        }
        let cookie = COOKIE.as_mut().unwrap().get_cookie();
        return cookie != "";
    }
}

#[tauri::command]
pub fn log_in(username: &str, password: &str) -> Result<bool, String> {
    let mut request = base_request("/login", Method::GET);
    request = request.basic_auth(username, Some(password));
    let response = request.send().or_else(|e| Err(format!("{}", e)))?;
    if response.status() == StatusCode::FORBIDDEN {
        return Err("Invalid credentials.".to_string());
    }
    Ok(true)
}

fn get(endpoint: &str) -> Result<Response, Error> {
    let request = base_request(endpoint, Method::GET);
    request.send()
}

fn post<S: Serialize>(endpoint: &str, body: &S) -> Result<Response, Error> {
    let mut request = base_request(endpoint, Method::POST);
    request = request.json(body);
    request.send()
}

fn patch<S: Serialize>(endpoint: &str, body: &S) -> Result<Response, Error> {
    let mut request = base_request(endpoint, Method::PATCH);
    request = request.json(body);
    request.send()
}

fn delete(endpoint: &str) -> Result<Response, Error> {
    let request = base_request(endpoint, Method::DELETE);
    request.send()
}

// post list
fn post_list(list: &ListEntry) -> Result<Response, Error> {
    let response = post("/lists", list);
    if response.is_err() { return Err(response.unwrap_err()); }
    let response = response.unwrap();
    set_cookie(&response);
    Ok(response)
}
// patch list
fn patch_list(list: &ListEntry) -> Result<Response, Error> {
    let response = patch(&format!("/lists/{}", list.uuid), list);
    if response.is_err() { return Err(response.unwrap_err()); }
    let response = response.unwrap();
    set_cookie(&response);
    Ok(response)
}
// delete list
fn delete_list(list: String) -> Result<Response, Error> {
    let response = delete(&format!("/lists/{}", list));
    if response.is_err() { return Err(response.unwrap_err()); }
    let response = response.unwrap();
    set_cookie(&response);
    Ok(response)
}

// post task
// patch task
// delete task

// sync
fn do_sync() -> bool {
    // Get updates
    // 
    return true;
}

#[tauri::command]
pub fn test_http(username: &str, password: &str) -> Result<bool, String> {
    log_in(username, password)
}

#[derive(Serialize, Deserialize)]
pub struct SyncData {
    pub last_sync: i64,
    pub lists: Vec<ListEntry>,
    pub tasks: HashMap<String, Vec<TaskEntry>>
}

impl SyncData {
    pub fn new() -> Self {
        SyncData {
            last_sync: now(),
            lists: Vec::new(),
            tasks: HashMap::new()
        }
    }
}