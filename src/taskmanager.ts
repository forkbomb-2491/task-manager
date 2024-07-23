import { TaskList } from "./tasklist";
import { HelpManager } from "./help";
import { TaskNotifier } from "./notifications";
import { Planner } from "./planner";
import { /*onSettingChange,*/ onSettingsLoad } from "./settings";
import { saveTasks, loadTasks } from "./storage";
import { TaskPlanner } from "./taskplan";
import { Task, onTaskEvent, List, colorStrToEnum, TaskColor, onListEdit } from "./task";

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

    private settingsLoaded: boolean = false;
    // private syncEnabled: boolean = false;

    constructor() {
        this.taskList = new TaskList(this);
        this.planner = new Planner(this);
        this.helpMgr = new HelpManager(this);
        this.taskPlanner = new TaskPlanner(this);
        this.taskNotifier = new TaskNotifier(this);
        // this.algorithm = new TheAlgorithm(this)

        onTaskEvent(_ => {
            saveTasks(this._lists).then()
            // if (this.syncEnabled) {
            //     sendTasks(this._tasks).then()
            // }
        });

        onListEdit(() => {
            saveTasks(this._lists).then()
            console.log("hi")
        })

        // document.getElementById("pushnowbutton")!.addEventListener("click", _ => this.sendTasks())
        // document.getElementById("pullfrombutton")!.addEventListener("click", _ => this.fetchTasks())

        onSettingsLoad(() => this.settingsLoaded = true);
        // onTaskAdopt(e => {
        //     const task = this.getTask(e.task.id)
        //     const list = this.getList(e.listUUID!)
        //     this.smartDueDate(task!, list!)
        // })
        // onSettingChange("syncEnabled", e => this.syncEnabled = e.value)
    }

    async start() {
        await this.loadTasks();
        this.render();
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

        if (this.settingsLoaded) {
            this.taskNotifier.refresh();
        } else {
            onSettingsLoad(() => this.taskNotifier.refresh());
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
        }

        if (task.parent == null) {
            list_!.addTask(task);
        }
        
        saveTasks(this._lists).then();
    }

    newList(name: string, color: TaskColor) {
        var list = new List(name, color)
        this._lists.push(list)
        saveTasks(this._lists).then()
    }
    
    deleteList(list: List) {
        this._lists = this._lists.filter(l => l.uuid != list.uuid)
        saveTasks(this._lists).then()
    }
}
