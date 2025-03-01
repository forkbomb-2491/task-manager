use std::path::Path;
use std::fs::write;

use crate::algorithm::DueEvent;
use crate::storage::DatabaseManager;
use serde_json::json;
use sqlx::Error;

static HIST_PATH: &'static str = "history.db"; // prod path
// static HIST_PATH: &'static str = "history2.db"; // dev path

pub struct History {
    db_mgr: Option<DatabaseManager>,
    path: String
}

impl History {
    pub async fn new(dir: String) -> Result<Self, String> {
        let path = Path::new(&dir).join(HIST_PATH);
        if !path.exists() {
            let _ = write(&path, "");
        }
        let path = path.to_str();
        let path = match path {
            Some(val) => Ok(val.to_owned()),
            None => Err("Failed to parse database path as String.".to_owned()),
        }?;
        let mut hist = History { db_mgr: None, path };
        hist.load().await?;
        Ok(hist)
    }

    pub async fn load(&mut self) -> Result<(), String> {
        if self.db_mgr.is_some() {
            return Ok(());
        }
        self.db_mgr = Some(DatabaseManager::new(self.path.to_owned()));
        self.db_mgr.as_mut().unwrap().connect().await?;
        let _ = self.db_mgr.as_ref().unwrap().execute(
            "CREATE TABLE DueEvents (\
            type INTEGER, \
            time BIGINT, \
            id TEXT, \
            list TEXT, \
            importance INTEGER, \
            size INTEGER, \
            due BIGINT \
        )",
            Vec::new(),
        )
        .await;
        Ok(())
    }

    pub async fn insert_due_event(&self, event: DueEvent) -> Result<(), String> {
        if self.db_mgr.is_none() {
            return Err("DbMgr not loaded.".to_string());
        }
        let values = Vec::from([
            json!(event.event_type as i32),
            json!(event.timestamp),
            json!(event.id),
            json!(event.list),
            json!(event.importance),
            json!(event.size),
            json!(event.due),
        ]);
        let result = self.db_mgr.as_ref().unwrap()
            .execute(
                " \
            INSERT INTO DueEvents \
            (type, time, id, list, importance, size, due) \
            VALUES \
            ($1, $2, $3, $4, $5, $6, $7)",
                values,
            )
            .await;
        if result.is_ok() {
            Ok(())
        } else {
            let error = &result.err().unwrap();
            if error.to_string().contains("1") {}
            Err(format!("{error}").to_owned())
        }
    }

    pub async fn filter_due_events(
        &self,
        conditions: Vec<String>,
    ) -> Result<Option<Vec<DueEvent>>, Error> {
        let mut query = "SELECT * FROM DueEvents".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        Ok(self.db_mgr.as_ref().unwrap().select_all::<DueEvent>(&query, Vec::new()).await?)
    }

    pub async fn clear_due_events(&self, conditions: Vec<String>) -> Result<(), String> {
        let mut query = "DELETE FROM DueEvents".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        self.db_mgr.as_ref().unwrap().execute(&query, Vec::new())
            .await
            .expect("Error deleting entries.");
        Ok(())
    }
}