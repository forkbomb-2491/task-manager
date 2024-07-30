use serde_json::{json, Value as JsonValue};
use sqlx::{migrate::MigrateDatabase, sqlite::SqliteRow, Error, FromRow, Pool};

use crate::{task::ListEntry, utils::now};

type Db = sqlx::sqlite::Sqlite;

async fn connect(path: &str) -> Result<Pool<Db>, Error> {
    if !Db::database_exists(path).await.unwrap_or(false) {
        Db::create_database(&("sqlite:".to_string().to_owned() + path)).await?;
    }
    let pool: Pool<Db> = Pool::connect(&("sqlite:".to_string().to_owned() + path)).await?;
    println!("{path}");
    Ok(pool)
}

pub struct DatabaseManager {
    pool: Option<Pool<Db>>,
    is_loaded: bool,
}

impl DatabaseManager {
    pub fn new() -> DatabaseManager {
        return DatabaseManager {
            pool: None,
            is_loaded: false,
        };
    }

    pub async fn execute(
        &mut self,
        query: &str,
        values: Vec<JsonValue>,
    ) -> Result<Option<(u64, i64)>, Error> {
        if !self.is_loaded {
            return Ok(None);
        }
        let mut query = sqlx::query(query);
        for val in values {
            if val.is_null() {
                query = query.bind(None::<JsonValue>);
            } else if val.is_string() {
                query = query.bind(val.as_str().unwrap().to_owned());
            } else {
                query = query.bind(val);
            }
        }
        let result = query.execute(&*self.pool.as_mut().unwrap()).await?;
        Ok(Some((result.rows_affected(), result.last_insert_rowid())))
    }

    pub async fn select_all<T>(
        &mut self,
        query: &str,
        values: Vec<JsonValue>,
    ) -> Result<Option<Vec<T>>, Error>
    where
        T: for<'r> FromRow<'r, SqliteRow> + std::marker::Send + std::marker::Unpin,
    {
        if !self.is_loaded {
            return Ok(None);
        }
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

    pub async fn select_one<T>(
        &mut self,
        query: &str,
        values: Vec<JsonValue>,
    ) -> Result<Option<T>, Error>
    where
        T: for<'r> FromRow<'r, SqliteRow> + std::marker::Send + std::marker::Unpin,
    {
        if !self.is_loaded {
            return Ok(None);
        }
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
        let ret: Result<T, Error> = query.fetch_one(&*self.pool.as_mut().unwrap()).await;
        if ret.is_ok() {
            Ok(Some(ret.unwrap()))
        } else {
            Ok(None)
        }
    }

    pub async fn load(&mut self, path: &str) -> Result<(), Error> {
        if self.is_loaded {
            return Ok(());
        }
        self.pool = Some(connect(path).await?);
        self.is_loaded = true;
        Ok(())
    }
}

pub struct TaskDb {
    db_mgr: Option<DatabaseManager>,
    is_loaded: bool,
}

impl TaskDb {
    pub fn new() -> TaskDb {
        return TaskDb {
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
            "CREATE TABLE Lists ( \
            uuid TEXT, \
            name TEXT, \
            color INTEGER, \
            created BIGINT, \
            last_edited BIGINT, \
            PRIMARY KEY(uuid) \
        )",
            Vec::new(),
        )
        .await;
        Ok(())
    }

    pub async fn new_list(&mut self, list: &ListEntry) -> Result<bool, Error> {
        if !self.is_loaded { return Ok(false); }
        let result = self.db_mgr.as_mut().unwrap().execute(
            "INSERT INTO Lists \
            (uuid, name, color, created, last_edited) \
            VALUES \
            (?, ?, ?, ?, ?)",
            vec![
                json!(list.uuid),
                json!(list.name),
                json!(list.color),
                json!(now()),
                json!(now())
            ]
        ).await?;
        if result.is_none() { return Ok(false); }
        let result = self.db_mgr.as_mut().unwrap().execute(
            &format!("CREATE TABLE '{}' ( \
            id TEXT, \
            name TEXT, \
            importance INTEGER, \
            size INTEGER, \
            due BIGINT, \
            parent TEXT, \
            created BIGINT, \
            last_edited BIGINT, \
            PRIMARY KEY(id) \
            )", list.uuid),
            Vec::new()
        ).await?;
        if result.is_none() { return Ok(false); }
        return Ok(true);
    }

    pub async fn edit_list(&mut self, list: &ListEntry) -> Result<bool, Error> {
        if !self.is_loaded { return Ok(false); }
        let current = self.db_mgr.as_mut().unwrap().select_one::<ListEntry>(
            "SELECT * FROM Lists WHERE uuid=?",
            vec![json!(list.uuid)]
        ).await?;
        if current.is_none() { return Ok(false); }
        let result = self.db_mgr.as_mut().unwrap().execute(
            "UPDATE Lists SET \
                name=?, \
                color=?, \
                last_edited=? \
            WHERE uuid=? \
            ", vec![
                json!(list.name),
                json!(list.color),
                json!(now()),
                json!(list.uuid)
            ]
        ).await?;
        if result.is_none() { return Ok(false); }
        return Ok(true);
    }

    pub async fn get_list(&mut self, list: String) -> Result<Option<ListEntry>, Error> {
        if !self.is_loaded { return Ok(None); }
        let entry = self.db_mgr.as_mut().unwrap().select_one::<ListEntry>(
            "SELECT * FROM Lists WHERE uuid=?",
            vec![json!(list)]
        ).await?;
        Ok(entry)
    }

    pub async fn get_lists(&mut self) -> Result<Option<Vec<ListEntry>>, Error> {
        if !self.is_loaded { return Ok(None); }
        self.db_mgr.as_mut().unwrap().select_all("SELECT * FROM Lists", Vec::new()).await
    }

    pub async fn delete_list(&mut self, list: String) -> Result<bool, Error> {
        if !self.is_loaded { return Ok(false); }
        let result = self.db_mgr.as_mut().unwrap().execute(
            "DELETE FROM Lists WHERE uuid=?",
            vec![json!(list)]
        ).await?;
        if result.is_none() { return Ok(false); }
        Ok(true)
    }
}

#[cfg(test)]
#[allow(unused)]
mod tests {
    // NOTE: These tests MUST be run with the --test-threads=1 argument
    use super::*;

    async fn load_tasks() -> TaskDb {
        let mut tasks = TaskDb::new();
        let load = tasks.load("testDb.db").await;
        assert!(load.is_ok());
        return tasks;
    }

    #[tokio::test]
    async fn test_new_list() {
        let mut tasks = load_tasks().await;
        let list = ListEntry {
            name: "test".to_string(),
            uuid: uuid::Uuid::new_v4().to_string(),
            color: 4,
            last_edited: None,
            created: None
        };
        let before = tasks.get_lists().await.unwrap();

        tasks.new_list(&list).await;

        let after = tasks.get_lists().await.unwrap();
        assert!(!after.is_none());
        if !before.is_none() {
            assert_eq!(after.unwrap().len() - before.unwrap().len(), 1);
        } else {
            assert_eq!(after.unwrap().len(), 1);
        }
    }

    #[tokio::test]
    async fn test_edit_list() {
        let mut tasks = load_tasks().await;
        let list_id = uuid::Uuid::new_v4().to_string();
        let list = ListEntry {
            name: "test".to_string(),
            uuid: list_id.clone(),
            color: 4,
            last_edited: None,
            created: None
        };
        tasks.new_list(&list).await;
        tasks.edit_list(&ListEntry { 
            name: "test2".to_string(), 
            uuid: list_id.clone(), 
            color: 4, 
            last_edited: None, 
            created: None 
        }).await;
        let list = tasks.get_list(list_id.clone()).await.unwrap();
        assert!(!list.is_none());
        let list = list.unwrap();
        assert_eq!(&list.uuid, &list_id);
        assert_eq!(&list.name, "test2");
    }

    #[tokio::test]
    async fn test_delete_list() {
        let mut tasks = load_tasks().await;
        let list_id = uuid::Uuid::new_v4().to_string();
        let list = ListEntry {
            name: "test".to_string(),
            uuid: list_id.clone(),
            color: 4,
            last_edited: None,
            created: None
        };

        tasks.new_list(&list).await;
        assert!(tasks.get_list(list_id.clone()).await.unwrap().is_some());
        
        tasks.delete_list(list_id.clone()).await;
        
        assert!(tasks.get_list(list_id.clone()).await.unwrap().is_none());
    }
}