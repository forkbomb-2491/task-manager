use crate::storage::*;
use crate::task::ListEntry;

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