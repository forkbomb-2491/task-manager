use sqlx::{
    migrate::MigrateDatabase, Pool
};
use tauri::{async_runtime::Mutex, AppHandle, Manager, Runtime};

type Db = sqlx::sqlite::Sqlite;

async fn connect(path: &str) -> Result<Pool<Db>, sqlx::Error> {
    if !Db::database_exists(path).await.unwrap_or(false) {
        Db::create_database(&("sqlite:".to_string().to_owned() + path)).await?;
    }
    let pool: Pool<Db> = Pool::connect(&("sqlite:".to_string().to_owned() + path)).await?;
    println!("{path}");
    Ok(pool)
}

static mut POOL: Option<Mutex<Pool<Db>>> = None;

#[tauri::command]
pub async fn init_history<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let path = app.path().app_data_dir().unwrap().to_str().expect("AppData failed to resolve").to_owned() + "/history.db";
    unsafe {
        if !POOL.is_none() {
            return Ok(());
        }
        POOL = Some(Mutex::new(connect(&path).await.expect("Error loading database.")));
    }
    Ok(())
}

#[tauri::command]
pub async fn close_history() -> Result<(), String> {
    println!("closingf");
    unsafe {
        if POOL.is_none() {
            return Ok(());
        }
        let pool = POOL.as_mut().unwrap().lock().await;
        pool.close().await;
        Ok(())
    }
}

#[tauri::command]
pub async fn history_exec(query: String) -> Result<(), String> {
    unsafe {
        if POOL.is_none() {
            return Err("History not initialized".to_string());
        }
        let pool = POOL.as_mut().unwrap().lock().await;
        let query = sqlx::query(&query);
        let result = query.execute(&*pool).await;
        println!("{result:?}");
        Ok(())
    }
}

#[tauri::command]
pub async fn history_select(query: String) -> Result<(), String> {
    unsafe {
        if POOL.is_none() {
            return Err("History not initialized".to_string());
        }
        let pool = POOL.as_mut().unwrap().lock().await;
        let query = sqlx::query(&query);
        let _result = query.fetch_all(&*pool).await;
        Ok(())
    }
}