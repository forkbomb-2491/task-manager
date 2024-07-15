use serde_json::{json, Value as JsonValue};
use sqlx::{
    migrate::MigrateDatabase, sqlite::SqliteRow, Error, FromRow, Pool
};
use crate::algorithm::DueEvent;

type Db = sqlx::sqlite::Sqlite;

async fn connect(path: &str) -> Result<Pool<Db>, Error> {
    if !Db::database_exists(path).await.unwrap_or(false) {
        Db::create_database(&("sqlite:".to_string().to_owned() + path)).await?;
    }
    let pool: Pool<Db> = Pool::connect(&("sqlite:".to_string().to_owned() + path)).await?;
    println!("{path}");
    Ok(pool)
}

#[allow(dead_code)]
async fn kill(path: &str) -> Result<(), Error> {
    Db::drop_database(&("sqlite:".to_string().to_owned() + path)).await
}

pub struct History {
    pool: Option<Pool<Db>>,
    is_loaded: bool
}

impl History {
    pub fn new() -> History {
        return History { pool: None, is_loaded: false };
    }

    async fn execute(&mut self, query: &str, values: Vec<JsonValue>) -> Result<Option<(u64, i64)>, Error> {
        if !self.is_loaded { return Ok(None) }
        let mut query = sqlx::query(query);
        for val in values {
            if val.is_null() {
                query = query.bind(None::<JsonValue>);
            } else if val.is_string() {
                query = query.bind(val.as_str().unwrap().to_owned())
            } else {
                query = query.bind(val);
            }
        }
        let result = query.execute(&*self.pool.as_mut().unwrap()).await?;
        Ok(Some((result.rows_affected(), result.last_insert_rowid())))
    }

    async fn select_all<T>(&mut self, query: &str, values: Vec<JsonValue>) -> Result<Option<Vec<T>>, Error>
    where 
        T: for<'r> FromRow<'r, SqliteRow> + std::marker::Send + std::marker::Unpin,
    {
        if !self.is_loaded { return Ok(None) }
        let mut query = sqlx::query_as(query);
        for val in values {
            if val.is_null() {
                query = query.bind(None::<JsonValue>);
            } else if val.is_string() {
                query = query.bind(val.as_str().unwrap().to_owned())
            } else {
                query = query.bind(val);
            }
        }
        let rows: Vec<T> = query.fetch_all(&*self.pool.as_mut().unwrap()).await?;
        Ok(Some(rows))
    }

    pub async fn load(&mut self, path: &str) -> Result<(), Error> {
        if self.is_loaded { return Ok(()); }
        self.pool = Some(connect(path).await?);
        self.is_loaded = true;
        self.execute("CREATE TABLE DueEvents (\
            type INTEGER, \
            time BIGINT, \
            id TEXT, \
            list TEXT, \
            importance INTEGER, \
            size INTEGER, \
            due BIGINT \
        )", Vec::new()).await?;
        Ok(())
    }
    
    #[allow(dead_code)]
    pub async fn close(&mut self) {
        self.pool.as_mut().unwrap().close().await;
    }

    pub async fn insert_due_event(&mut self, event: DueEvent) -> Result<(), String> {
        if self.pool.is_none() { return Err("Pool not loaded.".to_string()); }
        let values = Vec::from([
            json!(event.event_type as i32),
            json!(event.timestamp),
            json!(event.id),
            json!(event.list),
            json!(event.importance),
            json!(event.size),
            json!(event.due)
        ]);
        let result = self.execute(
            " \
            INSERT INTO DueEvents \
            (type, time, id, list, importance, size, due) \
            VALUES \
            ($1, $2, $3, $4, $5, $6, $7)", 
            values
        ).await;
        if result.is_ok() { Ok(()) }
        else {
            let error = &result.err().unwrap();
            if error.to_string().contains("1") {

            }
            Err(format!("{error}").to_owned()) 
        }
    }

    pub async fn filter_due_events(&mut self, conditions: Vec<String>) -> Result<Option<Vec<DueEvent>>, Error> {
        let mut query = "SELECT * FROM DueEvents".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        Ok(self.select_all::<DueEvent>(&query, Vec::new()).await?)
    }

    pub async fn clear_due_events(&mut self, conditions: Vec<String>) -> Result<(), String> {
        let mut query = "DELETE FROM DueEvents".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        self.execute(&query, Vec::new()).await.expect("Error deleting entries.");
        Ok(())
    }
}