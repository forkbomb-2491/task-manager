use std::path::Path;
use std::fs::write;

use serde_json::{json, Value as JsonValue};
use sqlx::{migrate::MigrateDatabase, sqlite::SqliteRow, Error, FromRow, Pool};

use crate::{task::{ListEntry, TaskEntry}, utils::now};

type Db = sqlx::sqlite::Sqlite;

#[derive(Clone)]
pub struct DatabaseManager {
    pool: Option<Pool<Db>>,
    path: String
    // is_loaded: bool,
}

impl DatabaseManager {
    pub fn new(path: String) -> DatabaseManager {
        return DatabaseManager {
            pool: None,
            path: path,
        };
    }

    pub async fn connect(&mut self) -> Result<(), String> {
        self.pool = Some(
            Pool::connect(&self.path)
                .await
                .map_err(|err| err.to_string())?,
        );
        Ok(())
    }

    fn is_loaded(&self) -> bool {
        self.pool.is_some()
    }

    pub async fn execute(
        &self,
        query: &str,
        values: Vec<JsonValue>,
    ) -> Result<Option<(u64, i64)>, Error> {
        if !self.is_loaded() {
            return Ok(None);
        }
        let mut query = sqlx::query(query);
        for val in values {
            if val.is_null() {
                query = query.bind(None::<JsonValue>);
            } else if val.is_string() {
                query = query.bind(val.as_str().unwrap().to_owned());
            } else if val.is_boolean() {
                query = query.bind(val.as_bool().unwrap());
            } else {
                query = query.bind(val);
            }
        }
        let result = query.execute(self.pool.as_ref().unwrap()).await?;
        Ok(Some((result.rows_affected(), result.last_insert_rowid())))
    }

    pub async fn select_all<T>(
        &self,
        query: &str,
        values: Vec<JsonValue>,
    ) -> Result<Option<Vec<T>>, Error>
    where
        T: for<'r> FromRow<'r, SqliteRow> + std::marker::Send + std::marker::Unpin,
    {
        if !self.is_loaded() {
            return Ok(None);
        }
        let mut query = sqlx::query_as(query);
        for val in values {
            if val.is_null() {
                query = query.bind(None::<JsonValue>);
            } else if val.is_string() {
                query = query.bind(val.as_str().unwrap().to_owned())
            } else if val.is_boolean() {
                query = query.bind(val.as_bool().unwrap());
            } else {
                query = query.bind(val);
            }
        }
        let rows: Vec<T> = query.fetch_all(self.pool.as_ref().unwrap()).await?;
        Ok(Some(rows))
    }

    pub async fn select_one<T>(
        &self,
        query: &str,
        values: Vec<JsonValue>,
    ) -> Result<Option<T>, Error>
    where
        T: for<'r> FromRow<'r, SqliteRow> + std::marker::Send + std::marker::Unpin,
    {
        if !self.is_loaded() {
            return Ok(None);
        }
        let mut query = sqlx::query_as(query);
        for val in values {
            if val.is_null() {
                query = query.bind(None::<JsonValue>);
            } else if val.is_string() {
                query = query.bind(val.as_str().unwrap().to_owned())
            } else if val.is_boolean() {
                query = query.bind(val.as_bool().unwrap());
            } else {
                query = query.bind(val);
            }
        }
        let ret: Result<T, Error> = query.fetch_one(self.pool.as_ref().unwrap()).await;
        if ret.is_ok() {
            Ok(Some(ret.unwrap()))
        } else {
            Ok(None)
        }
    }
}

#[derive(Clone)]
pub struct TaskDb {
    db_mgr: Option<DatabaseManager>,
    path: String,
}

impl TaskDb {
    pub async fn new(dir: String) -> Result<Self, String> {
        let path = Path::new(&dir).join("tasks.db");
        if !path.exists() {
            let _ = write(&path, "");
        }
        let path = path.to_str();
        let path = match path {
            Some(val) => Ok(val.to_owned()),
            None => Err("Failed to parse database path as String.".to_owned()),
        }?;
        let mut tasks = TaskDb { db_mgr: None, path };
        tasks.load().await?;
        Ok(tasks)
    }

    pub async fn load(&mut self) -> Result<(), String> {
        if self.db_mgr.is_some() {
            return Ok(());
        }
        self.db_mgr = Some(DatabaseManager::new(self.path.to_owned()));
        self.db_mgr.as_mut().unwrap().connect().await?;
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

    pub async fn new_list(&self, list: &ListEntry) -> Result<bool, Error> {
        if self.db_mgr.is_none() { return Ok(false); }
        if self.get_list(list.uuid.clone()).await.unwrap().is_some() { return Ok(false); }
        let result = self.db_mgr.as_ref().unwrap().execute(
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
        let result = self.db_mgr.as_ref().unwrap().execute(
            &format!("CREATE TABLE '{}' ( \
            id TEXT, \
            name TEXT, \
            importance INTEGER, \
            size INTEGER, \
            due BIGINT, \
            completed BOOLEAN, \
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

    pub async fn edit_list(&self, list: &ListEntry) -> Result<bool, Error> {
        if self.db_mgr.is_none() { return Ok(false); }
        let current = self.db_mgr.as_ref().unwrap().select_one::<ListEntry>(
            "SELECT * FROM Lists WHERE uuid=?",
            vec![json!(list.uuid)]
        ).await?;
        if current.is_none() { return Ok(false); }
        let result = self.db_mgr.as_ref().unwrap().execute(
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

    pub async fn get_list(&self, list: String) -> Result<Option<ListEntry>, Error> {
        if self.db_mgr.is_none() { return Ok(None); }
        let entry = self.db_mgr.as_ref().unwrap().select_one::<ListEntry>(
            "SELECT * FROM Lists WHERE uuid=?",
            vec![json!(list)]
        ).await?;
        Ok(entry)
    }

    pub async fn get_lists(&self) -> Result<Option<Vec<ListEntry>>, Error> {
        if self.db_mgr.is_none() { return Ok(None); }
        self.db_mgr.as_ref().unwrap().select_all("SELECT * FROM Lists", Vec::new()).await
    }

    pub async fn delete_list(&self, list: String) -> Result<bool, Error> {
        if self.db_mgr.is_none() { return Ok(false); }
        let result = self.db_mgr.as_ref().unwrap().execute(
            "DELETE FROM Lists WHERE uuid=?",
            vec![json!(list)]
        ).await?;
        if result.is_none() { return Ok(false); }
        Ok(true)
    }

    pub async fn new_task(&self, list: String, task: &TaskEntry) -> Result<bool, Error> {
        if self.db_mgr.is_none() { return Ok(false); }
        let result = self.db_mgr.as_ref().unwrap().execute(
            &format!("INSERT INTO '{}' \
                (id, name, importance, size, due, completed, parent, created, last_edited) \
                VALUES \
                (?, ?, ?, ?, ?, ?, ?, ?, ?) \
            ", list.clone()),
            vec![
                json!(task.id),
                json!(task.name),
                json!(task.importance),
                json!(task.size),
                json!(task.due),
                json!(task.completed),
                json!(task.parent),
                json!(now()),
                json!(now())
            ]
        ).await?;
        Ok(result.is_some())
    }

    pub async fn get_tasks(&self, list: String) -> Result<Option<Vec<TaskEntry>>, Error> {
        if self.db_mgr.is_none() { return Ok(None); }
        let result = self.db_mgr.as_ref().unwrap().select_all::<TaskEntry>(
            &format!("SELECT * FROM '{}'", &list), Vec::new()
        ).await?;
        Ok(result)
    }

    pub async fn get_task(&self, list: String, id: String) -> Result<Option<TaskEntry>, Error> {
        if self.db_mgr.is_none() { return Ok(None); }
        if self.get_list(list.clone()).await.unwrap().is_none() { return Ok(None); }
        let entry = self.db_mgr.as_ref().unwrap().select_one::<TaskEntry>(
            &format!("SELECT * FROM '{list}' WHERE id=?", ),
            vec![json!(id)]
        ).await?;
        Ok(entry)
    }

    pub async fn edit_task(&self, list: String, task: &TaskEntry) -> Result<bool, Error> {
        if self.db_mgr.is_none() { return Ok(false); }
        if self.get_list(list.clone()).await.unwrap().is_none() { return Ok(false); }
        if self.get_task(list.clone(), task.id.clone()).await.unwrap().is_none() { return Ok(false); }
        let result = self.db_mgr.as_ref().unwrap().execute(
            &format!("UPDATE '{}' SET \
                name=?, \
                size=?, \
                importance=?, \
                due=?, \
                completed=?, \
                id=?, \
                last_edited=? \
            WHERE id=?", list.clone()),
            vec![
                json!(task.name),
                json!(task.size),
                json!(task.importance),
                json!(task.due),
                json!(task.completed),
                json!(task.id),
                // json!(task.parent), disabled bc parents aren't changed unless by add
                json!(now()),
                json!(task.id)
            ]
        ).await?;
        Ok(result.is_some())
    }

    pub async fn delete_task(&self, list: String, id: String) -> Result<bool, Error> {
        if self.db_mgr.is_none() { return Ok(false); }
        if self.get_list(list.clone()).await.unwrap().is_none() { return Ok(false); }
        if self.get_task(list.clone(), id.clone()).await.unwrap().is_none() { return Ok(false); }
        let result = self.db_mgr.as_ref().unwrap().execute(
            &format!("DELETE FROM '{}' WHERE id=?", list.clone()), 
            vec![json!(id.clone())]
        ).await?;
        Ok(result.is_some())
    }

    pub async fn filter_tasks(
        &mut self,
        list: String,
        conditions: Vec<String>,
    ) -> Result<Option<Vec<TaskEntry>>, Error> {
        let mut query = format!("SELECT * FROM '{}'", list).to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        Ok(self.db_mgr.as_mut().unwrap().select_all::<TaskEntry>(&query, Vec::new()).await?)
    }

    pub async fn filter_lists(
        &mut self,
        conditions: Vec<String>,
    ) -> Result<Option<Vec<ListEntry>>, Error> {
        let mut query = "SELECT * FROM Lists".to_string();
        if conditions.len() > 0 {
            let conditions = conditions.join(" AND ");
            query += &(" WHERE ".to_string() + &conditions);
        }
        Ok(self.db_mgr.as_mut().unwrap().select_all::<ListEntry>(&query, Vec::new()).await?)
    }
}

