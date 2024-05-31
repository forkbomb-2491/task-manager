import { Task, TaskView } from "./task";
import { TaskManager } from "./main";

export class HelpManager implements TaskView {
    private taskMgr: TaskManager

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
    }

    render(): void {
        throw new Error("Method not implemented.");
    }

    refresh(): void {
        throw new Error("Method not implemented.");
    }

    addTask(task: Task): void {
        throw new Error("Method not implemented.");
    }
}

class OverwhelmedTaskPane implements TaskView {
    private taskMgr: TaskManager
    private element: HTMLDivElement

    constructor(taskMgr: TaskManager, element: HTMLDivElement) {
        this.taskMgr = taskMgr
        this.element = element
    }

    render(): void {
        throw new Error("Method not implemented.");
    }

    refresh(): void {
        throw new Error("Method not implemented.");
    }

    addTask(task: Task): void {
        throw new Error("Method not implemented.");
    }
}