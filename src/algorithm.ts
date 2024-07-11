import Database from "@tauri-apps/plugin-sql";
import { DATABASE_PATH } from "./storage";
import { TaskManager } from "./taskmanager";


export class TheAlgorithm {
    private db: Database
    private taskMgr: TaskManager

    constructor(taskMgr: TaskManager, path: string = DATABASE_PATH) {
        this.taskMgr = taskMgr
        this.db = new Database(path)

        // @ts-ignore
        window.db = this.db
    }
}