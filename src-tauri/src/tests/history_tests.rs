use crate::{algorithm::DueEvent, history::*, testutils::get_due_event};

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