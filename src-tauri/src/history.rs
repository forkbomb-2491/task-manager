use sqlx::{
    migrate::MigrateDatabase,
    // Column, Row, Pool
    Pool
};
// use tauri::{
//     AppHandle, Manager, Runtime, Window
// };

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

