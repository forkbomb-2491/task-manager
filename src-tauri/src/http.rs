use std::{collections::HashMap, env::consts::OS, fs::{self, read_to_string, remove_file, write}, str::FromStr, sync::Mutex, time::Duration};

use reqwest::{header, Error, Method, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string};
use tauri::{Event, Listener, Runtime, Url};
use reqwest::{Client, Response, RequestBuilder};

use crate::{task::{compare_and_save, ListEntry, TaskEntry}, utils::now};

// const API_ROOT: &str = "https://api.forkbomb2491.dev"; // Prod
// const COOKIE_PATH: &str = "/cookie"; // Prod
const API_ROOT: &str = "http://localhost:5000"; // Debug/testing
const COOKIE_PATH: &str = "/cookie2"; // Debug/testing

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

fn read_cookie() -> Option<String> {
    // Check if app data is set
    unsafe { 
        if APP_CONF_DIR.is_none() {
            return None;
        }
        let base_dir = APP_CONF_DIR.as_mut().unwrap().clone();
        let res = read_to_string(base_dir + COOKIE_PATH);
        if res.is_ok() {
            return Some(res.unwrap());
        } else {
            return None;
        }
    }
}

fn write_cookie(cookie: &str) {
    // Check if app data is set
    unsafe { 
        if APP_CONF_DIR.is_none() {
            return;
        }
        let base_dir = APP_CONF_DIR.as_mut().unwrap().clone();
        let res = write(base_dir + COOKIE_PATH, cookie);
        if res.is_err() {
            println!("Write cookie error {}", res.unwrap_err());
        }
    }
}

fn save_cookie(_e: Event) {
    // Check if cookie is initialized
    unsafe {
        if COOKIE.is_none() {
            return;
        }
        write_cookie(&COOKIE.as_mut().unwrap().get_cookie());
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
            write_cookie(cookie);
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
    ret = ret.timeout(Duration::from_secs(5));
    return ret;
}

#[tauri::command]
pub fn is_logged_in<R: Runtime>(app: tauri::AppHandle<R>) -> bool {
    unsafe {
        if COOKIE.is_none() {
            let cookie = read_cookie();
            if cookie.is_none() {
                return false;
            }
            app.listen_any("exit-requested", save_cookie);
            COOKIE = Some(SessionCooke::new());
            COOKIE.as_mut().unwrap().set_cookie(&cookie.unwrap());
        }
        let cookie = COOKIE.as_mut().unwrap().get_cookie();
        return cookie != "";
    }
}

#[tauri::command]
pub async fn log_in<R: Runtime>(app: tauri::AppHandle<R>, username: &str, password: &str) -> Result<bool, String> {
    let mut request = base_request("/login", Method::GET);
    request = request.basic_auth(username, Some(password));
    let response = request.send().await.or_else(|e| Err(format!("{}", e)))?;
    if response.status() == StatusCode::FORBIDDEN {
        return Err("Invalid credentials.".to_string());
    }
    unsafe { if COOKIE.is_none() {
        app.listen_any("exit-requested", save_cookie);
    }}
    set_cookie(&response);
    Ok(true)
}

#[tauri::command]
pub async fn log_out() -> Result<(),  ()> {
    unsafe {
        if COOKIE.is_none() { return Ok(()); }
        COOKIE = None;
        let base_dir = APP_CONF_DIR.as_mut().unwrap().clone();
        let _ = remove_file(base_dir + COOKIE_PATH);
        Ok(())
    }
}

async fn get(endpoint: &str) -> Result<Response, Error> {
    let request = base_request(endpoint, Method::GET);
    request.send().await
}

async fn post<S: Serialize>(endpoint: &str, body: &S) -> Result<Response, Error> {
    let mut request = base_request(endpoint, Method::POST);
    request = request.json(body);
    request.send().await
}

async fn patch<S: Serialize>(endpoint: &str, body: &S) -> Result<Response, Error> {
    let mut request = base_request(endpoint, Method::PATCH);
    request = request.json(body);
    request.send().await
}

async fn delete(endpoint: &str) -> Result<Response, Error> {
    let request = base_request(endpoint, Method::DELETE);
    request.send().await
}

// post list
async fn post_list(list: &ListEntry) -> Result<Response, Error> {
    let response = post("/lists", list).await;
    if response.is_err() { return Err(response.unwrap_err()); }
    let response = response.unwrap();
    set_cookie(&response);
    Ok(response)
}
// patch list
async fn patch_list(list: &ListEntry) -> Result<Response, Error> {
    let response = patch(&format!("/lists/{}", list.uuid), list).await;
    if response.is_err() { return Err(response.unwrap_err()); }
    let response = response.unwrap();
    set_cookie(&response);
    Ok(response)
}
// delete list
async fn delete_list(list: String) -> Result<Response, Error> {
    let response = delete(&format!("/lists/{}", list)).await;
    if response.is_err() { return Err(response.unwrap_err()); }
    let response = response.unwrap();
    set_cookie(&response);
    Ok(response)
}

// post task
// patch task
// delete task

// sync
#[tauri::command]
pub async fn do_sync() -> Result<(), String> {
    // Check connection is active
    unsafe {
        if COOKIE.is_none() || (COOKIE.is_some() && COOKIE.as_mut().unwrap().get_cookie() == "") {
            return Err("Not logged in.".to_string());
        }
    }
    // Get
    let response = get("/sync").await;
    if response.is_err() { return Err(format!("HTTP Error: {}", response.unwrap_err())); }
    let response = response.unwrap();
    // Compare and Save
    let body = response.text().await;
    if body.is_err() { return Err("Received no data from server.".to_string()); }
    let data: Result<SyncData, serde_json::Error> = from_str(&body.unwrap());
    if data.is_err() { return Err(format!("JSON Error: {}", data.unwrap_err())); }
    let comp_save_res = compare_and_save(&data.unwrap()).await;
    if comp_save_res.is_err() { return Err(format!("Compare and Save Error: {}", comp_save_res.unwrap_err())); }
    // TODO: Implement POST sync
    let to_post = comp_save_res.unwrap();
    if to_post.is_some() {
        let response = post("/sync", &to_string(&to_post.unwrap()).expect("Error converting POST data to String (sync)")).await;
        if response.is_err() { return Err(format!("HTTP Error: {}", response.unwrap_err())); }
        let response = response.unwrap();
        set_cookie(&response);
    }
    Ok(())
}

#[tauri::command]
pub async fn send_telemetry(device_id: String, previous_version: String) -> Result<bool, String> {
    let mut url = "".to_string();
    if previous_version == "0.0.0" {
        url = format!("/telemetry?device_id={}", device_id);
    } else {
        url = format!("/telemetry?device_id={}?previous={}", device_id, previous_version);
    }
    let resp = post(&url, &"".to_string()).await.or_else(|e| Err(format!("{}", e)));
    if resp.is_err() {
        return Err(resp.unwrap_err());
    }
    set_cookie(&resp.unwrap());
    Ok(true)
}

pub fn check_timestamp(last_sync: i64) -> i64 {
    let last_sync = last_sync + 1;
    if last_sync.ilog10() < 10 {
        last_sync * 1000
    } else {
        last_sync
    }
}

#[derive(Serialize, Deserialize, Debug)]
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