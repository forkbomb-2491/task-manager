import { setLastTheme, getTasksChanged, loadTasks } from './storage'
import { Task, TaskList } from './task'
import { Planner } from './planner'
import { onLoad } from './utils'

export async function changeTheme(theme: string) {
    var themes = document.head.getElementsByClassName("theme")
    for (let i = 0; i < themes.length; i++) {
        const themeSheet = themes[i];
        if (themeSheet.getAttribute("name") != theme && !themeSheet.hasAttribute("disabled")) {
            themeSheet.setAttribute("disabled", "")
        } else if (themeSheet.getAttribute("name") == theme) {
            themeSheet.removeAttribute("disabled")
        }
    }

    await setLastTheme(theme)
}

/**
 * The Task Manager. The closest we have to a class representing the whole app.
 */
export class TaskManager {
    private tasks: Task[] = []

    private taskList: TaskList
    private planner: Planner

    constructor() {
        this.taskList = new TaskList(this)
        this.planner = new Planner(this)

        onLoad(async () => {
            await this.onLoadCallback()
        })
    }

    async onLoadCallback() {
        await this.loadTasks()
        this.render()
    }

    private async loadTasks() {
        this.tasks = await loadTasks()
        for (let index = 0; index < this.tasks.length; index++) {
            const task = this.tasks[index];
            task.completeCallback = () => { this.refresh() }
            task.deleteCallback = () => { this.refresh() }
        }

        this.render()
    }

    private saveTasksViaEvent() {
        window.dispatchEvent(getTasksChanged(this.tasks))
    }

    private render() {
        this.taskList.render()
        this.planner.render()
    }

    private refresh() {
        this.taskList.refresh()
        this.planner.refresh()

        this.saveTasksViaEvent()
    }

    getTasks() {
        return [...this.tasks]
    }

    addTask(task: Task) {
        this.tasks.push(task)

        task.completeCallback = () => { this.refresh() }
        task.deleteCallback = () => { this.refresh() }

        this.planner.addTask(task)
        this.taskList.addTask(task)

        this.saveTasksViaEvent()
    }
}