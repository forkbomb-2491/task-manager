
#[derive(Default)]
pub struct TaskRecord {
    pub name: String,
    pub size: i32,
    pub importance: i32,
    pub list: String,
    pub due: i64,
    pub completed: bool,
    pub id: String
}