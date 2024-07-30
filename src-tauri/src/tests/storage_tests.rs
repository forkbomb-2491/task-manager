use crate::storage::*;
use crate::task::{ListEntry, TaskEntry};
use crate::utils::now;
use crate::testutils::delete_test_db;

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

    tasks.close().await;
    delete_test_db();
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

    tasks.close().await;
    delete_test_db();
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

    tasks.close().await;
    delete_test_db();
}

#[tokio::test]
async fn test_new_task() {
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

    let result = tasks.new_task(list_id.clone(), &TaskEntry {
        completed: false,
        created: None,
        last_edited: None,
        due: now(),
        id: "123456".to_string(),
        name: "testTask".to_string(),
        importance: 4,
        size: 1,
        parent: None
    }).await.or_else(|e| {
        println!("{e}");
        assert!(false);
        Err(e)
    });

    let task_vec = tasks.get_tasks(list_id.clone()).await.or_else(|e| {
        println!("{e}");
        assert!(false);
        Err(e)
    });
    
    let task_vec = task_vec.unwrap();
    assert!(task_vec.is_some());

    let mut task_vec = task_vec.unwrap();
    println!("{}", task_vec.len());
    assert!(task_vec.len() == 1);
    let task = task_vec.pop().unwrap();

    assert_eq!(task.completed, false);
    assert_eq!(task.id, "123456");
    assert_eq!(task.name, "testTask");

    tasks.close().await;
    delete_test_db();
}

#[tokio::test]
async fn test_get_task() {
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

    tasks.new_task(list_id.clone(), &TaskEntry {
        completed: false,
        created: None,
        last_edited: None,
        due: now(),
        id: "123456".to_string(),
        name: "testTask".to_string(),
        importance: 4,
        size: 1,
        parent: None
    }).await;

    let result = tasks.get_task(list_id.clone(), "123456".to_string()).await.or_else(|e| {
        println!("{e}");
        assert!(false);
        Err(e)
    }).unwrap();

    assert!(result.is_some());
    let result = result.unwrap();

    assert_eq!(result.id, "123456");
    assert_eq!(result.name, "testTask");

    tasks.close().await;
    delete_test_db();
}

#[tokio::test]
async fn test_edit_task() {
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

    tasks.new_task(list_id.clone(), &TaskEntry {
        completed: false,
        created: None,
        last_edited: None,
        due: now(),
        id: "123456".to_string(),
        name: "testTask".to_string(),
        importance: 4,
        size: 1,
        parent: None
    }).await;

    let result = tasks.edit_task(list_id.clone(), &TaskEntry {
        completed: false,
        created: None,
        last_edited: None,
        due: now(),
        id: "123456".to_string(),
        name: "testTaskk".to_string(),
        importance: 4,
        size: 1,
        parent: None
    }).await.or_else(|e| {
        println!("{e}");
        assert!(false);
        Err(e)
    }).unwrap();
    assert!(result);

    let task = tasks.get_task(list_id.clone(), "123456".to_string()).await.unwrap().unwrap();
    assert_eq!(task.name, "testTaskk");

    tasks.close().await;
    delete_test_db();
}

#[tokio::test]
async fn test_delete_task() {
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

    tasks.new_task(list_id.clone(), &TaskEntry {
        completed: false,
        created: None,
        last_edited: None,
        due: now(),
        id: "123456".to_string(),
        name: "testTask".to_string(),
        importance: 4,
        size: 1,
        parent: None
    }).await;

    let result = tasks.delete_task(list_id.clone(), "123456".to_string()).await.or_else(|e| {
        println!("{e}");
        assert!(false);
        Err(e)
    }).unwrap();
    assert!(result);

    let task = tasks.get_task(list_id.clone(), "123456".to_string()).await.unwrap();
    assert!(task.is_none());

    tasks.close().await;
    delete_test_db();
}

// Test edits apply only to target
// Test deletes only apply to target