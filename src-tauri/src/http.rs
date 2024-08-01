use std::{env::consts::OS, str::FromStr};

use reqwest::{header, Method, StatusCode};
use tauri::{http::response, Runtime, Url};
use reqwest::blocking::{Client, Request, Response, RequestBuilder};

// const API_ROOT: &str = "https://api.forkbomb2491.dev";
const API_ROOT: &str = "http://localhost:5000";

static mut COOKIE: &str = "";

fn base_request(endpoint: &str, method: Method) -> RequestBuilder {
    let mut ret = Client::new()
        .request(method, Url::from_str(
            &(API_ROOT.to_owned() + endpoint)
        ).unwrap());
    ret = ret.header(header::USER_AGENT, format!("Task-Manager/{} ({})", env!("CARGO_PKG_VERSION"), OS));
    unsafe {
        if !COOKIE.is_empty() {
            ret = ret.header(header::COOKIE, COOKIE);
        }
    }
    return ret;
}

fn set_cookie(response: &Response) {
    let response: *const Response = response;
    unsafe {
        if (*response).headers().contains_key(header::SET_COOKIE) {
            COOKIE = (*response)
                .headers()
                .get(header::SET_COOKIE)
                .unwrap()
                .to_str()
                .unwrap();
        }
    }
}

fn log_in(username: &str, password: &str) -> Result<bool, String> {
    let mut request = base_request("/login", Method::GET);
    request = request.basic_auth(username, Some(password));
    let response = request.send().or_else(|e| Err(format!("{}", e)))?;
    if response.status() == StatusCode::FORBIDDEN {
        return Err("Invalid credentials.".to_string());
    }
    set_cookie(&response);
    Ok(true)
}

#[tauri::command]
pub fn test_http(username: &str, password: &str) -> Result<bool, String> {
    log_in(username, password)
}