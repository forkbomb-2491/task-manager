import { TaskManager } from "./main"

// const ALGO_CONST = 1

/**
 * A View for Tasks. It displays, sorts, and processes user input for
 * the Task Manager. It is typical to have one of these per tab where
 * tasks are manipulated.
 */
export interface TaskView {
    /**
     * Clears the UI for which the TaskView is responsible and reloads all
     * tasks and relevant elements from scratch.
     */
    render(): void

    /**
     * Checks all existing UI elements to verify they are correctly placed
     * and that all attributes match internal state.
     */
    refresh(): void

    /**
     * Adds a new Task to the View without refreshing or re-rendering.
     * @param task The new Task to add
     */
    addTask(task: Task): void
}

/**
 * A Task View that represents and handles the Tasks tab.
 */
export class TaskList implements TaskView {
    private taskMgr: TaskManager

    constructor (taskMgr: TaskManager) {
        this.taskMgr = taskMgr
    }

    /**
     * Loads tasks from the List's TaskManager and sorts them into the
     * completed and current task lists.
     */
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

    /**
     * Checks to see that all completed and current tasks are sorted into
     * the correct lists on the Tasks tab.
     */
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

/** 
* This class represents a Task.
*/
export class Task {
    // id: string
    
    name: string
    size: number
    importance: number
    category: string
    due: Date
    completed: boolean

    deleted: boolean = false

    completeCallback: (() => void) | null = null
    deleteCallback: (() => void) | null = null

    private listElement: HTMLDivElement | null = null
    private plannerElement: HTMLParagraphElement | null = null

    constructor(name: string, size: string, importance: string, category: string, due: Date, completed: boolean = false) {
        this.name = name
        this.size = Number(size)
        this.importance = Number(importance)
        this.category = category
        
        this.due = new Date(due)
        this.due = new Date(this.due.getUTCFullYear(), this.due.getUTCMonth(), this.due.getUTCDate())
        this.completed = completed
    }

    /**
     * Returns an Object a la-Map which can be encoded and saved to the disk.
     * @returns An Object
     */
    toBasicObject() {
        return {
            "name": this.name,
            "size": this.size,
            "importance": this.importance,
            "category": this.category,
            "due": this.due,
            "completed": this.completed
        }
    }

    /**
     * Deletes the Task from both the TaskManager and removes all the relevant
     * elements.
     */
    delete() {
        if (this.listElement != null) { this.listElement.remove() }
        if (this.plannerElement != null) { this.plannerElement.remove() }

        this.deleted = true

        if (this.deleteCallback != null) {
            this.deleteCallback()
        }
    }

    /**
     * Sets the Task as completed. Updates all HTML elements.
     */
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

    /**
     * Returns the HTML Element representing this task for the Tasks tab.
     * @returns A <div class="task"> HTML Element
     */
    getTaskListElement() {
        if (this.listElement != null) {
            return this.listElement
        }

        var newElement = document.createElement("div")
        newElement.className = this.completed ? "task completed": "task"
        newElement.innerHTML = `
            <button class="complete"></button>
            <div style="width: 50%;">
                ${this.name}
            </div>
            <div style="width: 10%;">
                ${this.category}
            </div>
            <div style="width: 7.5%;">
                ${TaskSizes[this.size]}
            </div>
            <div style="width: 12.5%;">
                ${TaskImportances[this.importance]}
            </div>
            <div style="width: 16%;">
                ${this.due.toDateString()}
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

        if (this.category != "Default") {
            newElement.style.color = getColor(this.category)
        }

        this.listElement = newElement
        return newElement
    }

    /**
     * Returns the HTML Element representing this task for the Planner tab
     * @returns A <p> HTML Element with a square checkbox.
     */

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

        if (this.category != "Default") {
            newElement.style.color = getColor(this.category)
        }

        this.plannerElement = newElement
        return newElement
    }
}

// export class TheAlgorithm {
//     private static taskDueInXDays(task: Task) {
//         return task.due.valueOf() - (new Date()).valueOf()
//     }
// }

/**
 * This enum documents task category colors
 */
export const CAT_COLORS: {  } = {
    "Red": "var(--cat1-color)",
    "Orange": "var(--cat2-color)",
    "Yellow": "var(--cat3-color)",
    "Green": "var(--cat4-color)",
    "Blue": "var(--cat5-color)",
    "Purple": "var(--cat6-color)"
}

/**
 * This enum documents task sizes
 */
export enum TaskSizes {
    "Tiny",
    "Small",
    "Medium",
    "Big",
    "Huge"
}

/**
 * This enum documents task importance
 */
export enum TaskImportances {
    "Trivial",
    "Unimportant",
    "Average",
    "Important",
    "Vital"
}

function getColor(color: string) {
    switch (color) {
        case "Red":
            return "var(--cat1-color)"
    
        case "Orange":
            return "var(--cat2-color)"
    
        case "Yellow":
            return "var(--cat3-color)"
    
        case "Green":
            return "var(--cat4-color)"
    
        case "Blue":
            return "var(--cat5-color)"
    
        case "Purple":
            return "var(--cat6-color)"

        default:
            return "inherit"
    }
}
