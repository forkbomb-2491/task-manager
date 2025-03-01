#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures::executor::block_on;

fn main() {
    block_on(task_manager::run());
}
