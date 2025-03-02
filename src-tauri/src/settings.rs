// const FRONTEND_SETTINGS: Vec<&str> = vec![
//     "lastTheme",
//     "plannerFlipped",
//     "lastTab",
//     "plannerStartDay",
//     "recListLength",
//     "checkinsEnabled",
//     "remindersEnabled",
//     "checkInStart",
//     "checkInInterval",
//     "checkInDaysEnabled"
// ];

use std::fs::{copy, create_dir, exists, read_dir};

use tauri::{Manager, Runtime};
use tauri_plugin_dialog::DialogExt;

use crate::utils::get_database_dir;

#[tauri::command]
pub async fn change_database_path<R: Runtime>(app: tauri::AppHandle<R>, target: String) -> Result<(), String> {
    let target = target + "/Task Manager";
    if !exists(&target).unwrap() {
        let _ = create_dir(&target).unwrap();
    }
    let do_move = app.dialog()
        .message("Would you like to move your existing tasks to this new location? THIS WILL OVERWRITE ANY EXISTING TASK MANAGER DATABASE FILES!!")
        .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancel)
        .blocking_show();
    if do_move {
        let mut current_dir = read_dir(get_database_dir(app.path()).unwrap()).unwrap();
        while let Some(i) = current_dir.next() {
            let entry = i.unwrap();
            if entry.file_name().to_str().unwrap().ends_with("db") {
                let _ = copy(entry.path(), target.clone() + "/" + entry.file_name().to_str().unwrap());
            }
        }
    }
    let _ = app.dialog()
        .message("All done! Please close and reopen Task Manager.")
        .blocking_show();
    Ok(())
}