use crate::algorithm::DueEvent;
use crate::storage::DatabaseManager;
use serde_json::json;
use sqlx::Error;

pub struct History {
    db_mgr: Option<DatabaseManager>,
    is_loaded: bool,
}

impl History {
    pub fn new() -> History {
        return History {
            db_mgr: None,
            is_loaded: false,
        };
    }

    pub async fn load(&mut self, path: &str) -> Result<(), Error> {
        if self.is_loaded {
            return Ok(());
        }
        self.db_mgr = Some(DatabaseManager::new());
        self.db_mgr.as_mut().unwrap().load(path).await?;
        self.is_loaded = true;
        let _ = self.db_mgr.as_mut().unwrap().execute(
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

    #[allow(unused)]
    pub async fn close(&mut self) -> bool {
        if !self.is_loaded { return false; }
        self.db_mgr.clone().unwrap().close().await;
        self.db_mgr = None;
        self.is_loaded = false;
        return true;
    }

    pub async fn insert_due_event(&mut self, event: DueEvent) -> Result<(), String> {
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
        let result = self.db_mgr.as_mut().unwrap()
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
        &mut self,
        conditions: Vec<String>,
    ) -> Result<Option<Vec<DueEvent>>, Error> {
        let mut query = "SELECT * FROM DueEvents".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        Ok(self.db_mgr.as_mut().unwrap().select_all::<DueEvent>(&query, Vec::new()).await?)
    }

    pub async fn clear_due_events(&mut self, conditions: Vec<String>) -> Result<(), String> {
        let mut query = "DELETE FROM DueEvents".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        self.db_mgr.as_mut().unwrap().execute(&query, Vec::new())
            .await
            .expect("Error deleting entries.");
        Ok(())
    }
}

#[cfg(test)]
#[allow(unused)]
mod tests {
    // NOTE: These tests MUST be run with the --test-threads=1 argument
    use crate::testutils::get_due_event;

    use super::*;

    async fn load_history() -> History {
        let mut history = History::new();
        let load = history.load("testDb.db").await;
        assert!(load.is_ok());
        return history;
    }

    async fn get_all_due(hist: &mut History) -> Vec<DueEvent> {
        let before = hist.filter_due_events(Vec::new()).await;
        assert!(before.is_ok());
        if before.as_ref().unwrap().is_none() {
            Vec::new()
        } else {
           before.unwrap().unwrap()
        }
    }

    #[tokio::test]
    async fn test_insert_due_event() {
        let mut hist = load_history().await;
        let before = get_all_due(&mut hist).await;

        hist.insert_due_event(get_due_event()).await;

        let after = get_all_due(&mut hist).await;
        assert!(after.len() - before.len() == 1);
    }

    #[tokio::test]
    async fn test_filter_due_events_by_list() {
        let mut hist = load_history().await;
        let before = get_all_due(&mut hist).await;
        let mut before_count = 0;
        for event in &before {
            if event.list == "test".to_string() {
                before_count += 1;
            }
        }

        let mut event = get_due_event();
        hist.insert_due_event(event).await;

        let mut event = get_due_event();
        event.size = 0;
        hist.insert_due_event(event).await;
        
        let mut event = get_due_event();
        event.list = "test2".to_string();
        hist.insert_due_event(event).await;

        let filtered = hist.filter_due_events(Vec::from([
            "list='test'".to_string()
        ])).await.unwrap().unwrap();

        assert!(filtered.len() - before_count == 2);
    }

    #[tokio::test]
    async fn test_filter_due_events_by_importance() {
        let mut hist = load_history().await;
        let before = get_all_due(&mut hist).await;
        let mut before_count = 0;
        for event in &before {
            if event.importance == 3 {
                before_count += 1;
            }
        }

        let mut event = get_due_event();
        hist.insert_due_event(event).await;
        
        let mut event = get_due_event();
        event.list = "test2".to_string();
        hist.insert_due_event(event).await;

        let mut event = get_due_event();
        event.importance = 4;
        hist.insert_due_event(event).await;

        let filtered = hist.filter_due_events(Vec::from([
            "importance=3".to_string()
        ])).await.unwrap().unwrap();

        assert!(filtered.len() - before_count == 2);
    }

    #[tokio::test]
    async fn test_filter_due_events_by_size() {
        let mut hist = load_history().await;
        let before = get_all_due(&mut hist).await;
        let mut before_count = 0;
        for event in &before {
            if event.size == 2 {
                before_count += 1;
            }
        }

        let mut event = get_due_event();
        hist.insert_due_event(event).await;
        
        let mut event = get_due_event();
        event.size = 3;
        hist.insert_due_event(event).await;

        let mut event = get_due_event();
        event.importance = 4;
        hist.insert_due_event(event).await;

        let filtered = hist.filter_due_events(Vec::from([
            "size=2".to_string()
        ])).await.unwrap().unwrap();

        assert!(filtered.len() - before_count == 2);
    }
}