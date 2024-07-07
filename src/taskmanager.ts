import { TaskList } from "./tasklist";
import { HelpManager } from "./help";
import { TaskNotifier } from "./notifications";
import { Planner } from "./planner";
import { onSettingsLoad } from "./settings";
import { saveTasks, loadTasks } from "./storage";
import { TaskPlanner } from "./taskplan";
import { Task, onTaskEvent, TaskEvent, TaskEventType } from "./task";

/**
 * The Task Manager.
 */

export class TaskManager {
    private _tasks: Task[] = [];

    get tasks(): Task[] {
        return [...this._tasks];
    }

    private taskList: TaskList;
    private planner: Planner;
    private helpMgr: HelpManager;
    private taskPlanner: TaskPlanner;
    private taskNotifier: TaskNotifier;

    private settingsLoaded: boolean = false;

    constructor() {
        this.taskList = new TaskList(this);
        this.planner = new Planner(this);
        this.helpMgr = new HelpManager(this);
        this.taskPlanner = new TaskPlanner(this);
        this.taskNotifier = new TaskNotifier(this);

        // window.addEventListener(
        //     "focus",
        //     _ => this.refresh()
        // );
        onTaskEvent(_ => saveTasks(this._tasks).then());

        onSettingsLoad(() => this.settingsLoaded = true);
    }

    async start() {
        await this.loadTasks();
        this.render();
    }

    private async loadTasks() {
        this._tasks = (await loadTasks()).map(
            o => new Task(
                o.name,
                o.size,
                o.importance,
                o.category,
                o.due,
                o.completed,
                o.id,
                o.subtasks,
                null
            )
        );

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
        return this.flattenTaskList(this._tasks);
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

    addTask(task: Task) {
        if (task.parent == null) {
            this._tasks.push(task);
        }
        window.dispatchEvent(new TaskEvent(TaskEventType.add, task.record));
        saveTasks(this._tasks).then();
    }
}
