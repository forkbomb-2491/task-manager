import { TaskList } from "./tasklist";
import { HelpManager } from "./help";
import { TaskNotifier } from "./notifications";
import { Calendar, Planner } from "./planner";
import { EisenManager } from "./eisenhower";
import { onSettingChange, onSettingsLoad } from "./settings";
import { loadTasks } from "./storage";
import { TaskPlanner } from "./taskplan";
import { Task, List, colorStrToEnum, TaskColor, ListEvent, TaskEventType, onTaskEvent, onListEdit } from "./task";
import { getElement, onWindowFocused } from "./utils";
import { doSync, isAuthenticated } from "./http";

const MIN_SYNC_SPACING = 5 * 60 * 1000

/**
 * The Task Manager.
 */
export class TaskManager {
    private _lists: List[] = [];

    get tasks(): Task[] {
        var tasks: Task[] = []
        this._lists.forEach(list => {
            list.tasks.forEach(task => {
                tasks.push(task)
            })
        })
        return tasks;
    }
    get lists(): List[] {
        return [...this._lists]
    }

    private taskList: TaskList;
    private planner: Planner;
    private helpMgr: HelpManager;
    private taskPlanner: TaskPlanner;
    private taskNotifier: TaskNotifier;
    private calendar: Calendar;
    private eisenMgr: EisenManager;

    private settingsLoaded: boolean = false;
    private syncEnabled: boolean = false;
    private lastSync: number = 0;

    constructor() {
        this.taskList = new TaskList(this);
        this.planner = new Planner(this);
        this.helpMgr = new HelpManager(this);
        this.taskPlanner = new TaskPlanner(this);
        this.taskNotifier = new TaskNotifier(this);
        this.calendar = new Calendar(this);
        this.eisenMgr = new EisenManager(this);

        onSettingsLoad(() => this.settingsLoaded = true);
        onSettingChange("syncEnabled", e => {
            this.syncEnabled = e.value
        })
    }

    async start() {
        await this.loadTasks();
        this.render();

        onWindowFocused(() => this.sync().then())
        onTaskEvent(_ => this.sync(true).then(), true, true)
        onListEdit(_ => this.sync(true).then())
        getElement("syncnowbutton").addEventListener(
            "click",
            _ => this.sync(true).then()
        )
    }

    private async loadTasks() {
        var tasks = await loadTasks()
        tasks.forEach(list => {
            this._lists.push(List.fromRecord(list))
        })

        this.render();
    }

    private render() {
        this.taskList.render();
        this.planner.render();
        this.helpMgr.render();
        this.taskPlanner.render();
        this.calendar.render();
        this.eisenMgr.render();

        if (this.settingsLoaded) {
            this.taskNotifier.refresh();
        } else {
            onSettingsLoad(() => this.taskNotifier.refresh());
        }
    }

    private async sync(force: boolean = false) {
        if (!this.syncEnabled) {
            return
        }
        if (Date.now() - this.lastSync < MIN_SYNC_SPACING && !force) {
            return
        } else if (!isAuthenticated()) {
            return
        }

        const res = await doSync()
        if (res) {
            this.lastSync = Date.now()
            await loadTasks()
        }
    }

    private flattenTaskList(currentList: Task[]): Task[] {
        var ret: Task[] = [];
        for (let i = 0; i < currentList.length; i++) {
            const currentTask = currentList[i];
            ret.push(currentTask);
            if (currentTask.subtasks.length > 0) {
                ret = ret.concat(this.flattenTaskList(currentTask.subtasks));
            }
        }
        return ret;
    }

    getTasks() {
        return this.flattenTaskList(this.tasks);
    }

    getTask(id: string): Task | null {
        for (let i = 0; i < this.getTasks().length; i++) {
            const task = this.getTasks()[i];
            if (task.id == id) {
                return task;
            }
        }

        return null;
    }
    
    getList(list: string): List | null {
        for (let i = 0; i < this._lists.length; i++) {
            const lis = this._lists[i];
            if (lis.uuid == list || lis.name == list) {
                return lis
            }
        }
        return null
    }

    addTask(task: Task, list: string) {
        var list_: List | undefined
        for (let i = 0; i < this._lists.length; i++) {
            const l = this._lists[i];
            if (l.name == list || l.uuid == list) {
                list_ = l
                break
            }
        }
        if (list_ == undefined) {
            list_ = new List(list, colorStrToEnum(list))
            this._lists.push(list_)
            window.dispatchEvent(new ListEvent(TaskEventType.add, list_.record))
        }

        if (task.parent == null) {
            list_!.addTask(task);
        }
    }

    newList(name: string, color: TaskColor) {
        var list = new List(name, color)
        this._lists.push(list)
        window.dispatchEvent(new ListEvent(TaskEventType.add, list.record))
    }
    
    deleteList(list: List) {
        this._lists = this._lists.filter(l => l.uuid != list.uuid)
        window.dispatchEvent(new ListEvent(TaskEventType.delete, list.record))
    }
}
