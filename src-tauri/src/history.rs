use sqlx::{
    migrate::MigrateDatabase,
    // Column, Row, Pool
    Pool
};
use tauri::{path::PathResolver, AppHandle, Manager, Runtime};

type Db = sqlx::sqlite::Sqlite;

#[tauri::command]
pub async fn test_db(path: &str) -> Result<(), String> {
    let _pool = connect(path).await;
    
    Ok(())
}

async fn connect(path: &str) -> Result<Pool<Db>, sqlx::Error> {
    if !Db::database_exists(path).await.unwrap_or(false) {
        Db::create_database(&("sqlite:".to_string().to_owned() + path)).await?;
    }
    let pool: Pool<Db> = Pool::connect(&("sqlite:".to_string().to_owned() + path)).await?;
    Ok(pool)
}

pub struct HistoryManager {
    pool: Pool<Db>,
    loaded: bool
}

impl HistoryManager {
    pub async fn load<R: Runtime>(&mut self, app: AppHandle<R>) -> Result<(), sqlx::Error> {
        let mut path = app.path()
            .app_data_dir()
            .unwrap();
        path.set_file_name("history.db");
        self.pool = connect(path.to_str().expect("AppData failed to resolve")).await?;
        self.loaded = true;
        Ok(())
    } 
}