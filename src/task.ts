import { TaskManager } from "./main"

export class TaskList {
    private taskMgr: TaskManager

    constructor (taskMgr: TaskManager) {
        this.taskMgr = taskMgr
    }

    render() {
        var currentList = document.getElementById("currenttasklist")!
        var completedList = document.getElementById("completedtasklist")!

        currentList.innerHTML = ""
        completedList.innerHTML = ""

        var tasks = this.taskMgr.getTasks()
        for (let index = 0; index < tasks.length; index++) {
            const task = tasks[index];
            if (task.deleted) { continue }
            if (task.completed) {
                completedList.appendChild(task.getTaskListElement())
            } else {
                currentList.appendChild(task.getTaskListElement())
            }
        }
    }

    refresh() {
        var currentList = document.getElementById("currenttasklist")!;
        var completedList = document.getElementById("completedtasklist")!;
        for (let i = 0; i < currentList.children.length; i++) {
            const task = currentList.children[i];
            if (task.className.includes("completed")) {
                currentList.removeChild(task)
                completedList.appendChild(task)
            }
        }

        for (let i = 0; i < completedList.children.length; i++) {
            const task = completedList.children[i];
            if (!task.className.includes("completed")) {
                completedList.removeChild(task)
                currentList.appendChild(task)
            }
        }
    }

    addTask(task: Task) {
        document.getElementById("currenttasklist")!.appendChild(task.getTaskListElement())
    }
}

export class Task {
    // id: string
    
    name: string
    bigness: string
    category: string
    due: Date
    completed: boolean

    deleted: boolean = false

    completeCallback: (() => void) | null = null
    deleteCallback: (() => void) | null = null

    private listElement: HTMLDivElement | null = null
    private plannerElement: HTMLParagraphElement | null = null

    constructor(name: string, bigness: string, category: string, due: Date, completed: boolean = false) {
        this.name = name
        this.bigness = bigness
        this.category = category
        
        this.due = due
        this.completed = completed
    }

    toBasicObject() {
        return {
            "name": this.name,
            "bigness": this.bigness,
            "category": this.category,
            "due": this.due,
            "completed": this.completed
        }
    }

    delete() {
        if (this.listElement != null) { this.listElement.remove() }
        if (this.plannerElement != null) { this.plannerElement.remove() }

        this.deleted = true

        if (this.deleteCallback != null) {
            this.deleteCallback()
        }
    }

    toggleCompleted() {
        if (!this.completed) {
            if (this.listElement != null) { this.listElement.className += " completed" }
            if (this.plannerElement != null) { this.plannerElement.className += " completed" }
        } else {
            if (this.listElement != null) { this.listElement.className = this.listElement.className.replace(" completed", "") }
            if (this.plannerElement != null) { this.plannerElement.className = this.plannerElement.className.replace(" completed", "") }
        }

        this.completed = !this.completed

        if (this.completeCallback != null) {
            this.completeCallback()
        }
    }

    getTaskListElement() {
        if (this.listElement != null) {
            return this.listElement
        }

        var newElement = document.createElement("div")
        newElement.className = this.completed ? "task completed": "task"
        newElement.innerHTML = `
            <button class="complete"></button>
            <div style="width: 60%;">
                ${this.name}
            </div>
            <div style="width: 19%;">
                ${this.category}
            </div>
            <div style="width: 9%;">
                ${this.bigness}
            </div>
            <div style="width: 19%;">
                ${this.due}
            </div>
            <button style="background: none; border: 0;" class="deletetask">
                🗑️
            </button>
        `

        var deleteTaskCallback = (_: Event) => { this.delete() }
        var completeTaskCallback = (_: Event) => { this.toggleCompleted() }

        newElement.getElementsByClassName("complete")[0].addEventListener(
            "click",
            completeTaskCallback
        )

        newElement.getElementsByClassName("deletetask")[0].addEventListener(
            "click",
            deleteTaskCallback
        )

        this.listElement = newElement
        return newElement
    }

    getPlannerElement() {
        if (this.plannerElement != null) {
            return this.plannerElement
        }

        var newElement = document.createElement("p")
        if (this.completed) {
            newElement.className = " completed"
        }
        newElement.innerHTML = `
        <button class="complete"></button>
        ${this.name}
        `

        var completeTaskCallback = (_: Event) => { this.toggleCompleted() }

        newElement.getElementsByClassName("complete")[0].addEventListener(
            "click",
            completeTaskCallback
        )

        this.plannerElement = newElement
        return newElement
    }
}