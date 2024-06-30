import { TaskManager } from "./main"
import { padWithLeftZeroes } from "./utils"

const TaskChanged = new Event("taskchanged")

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

        document.getElementById("completedtasksbutton")!.addEventListener(
            "click",
            (_) => { this.toggleCompletedVisibility() }
        )
    }

    /**
     * Loads tasks from the List's TaskManager and sorts them into the
     * completed and current task lists.
     */
    render() {
        var currentList = document.getElementById("currenttasklist")!
        var completedList = document.getElementById("completedtasklist")!

        // Wipe current contents
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

    private toggleCompletedVisibility() {
        var list = document.getElementById("completedtasklist")!
        if (list.style.display == "none") {
            list.style.display = "block"
        } else {
            list.style.display = "none"
        }
    }
}

export type TaskRecord = {
    "name": string,
    "size": number,
    "importance": number,
    "category": string,
    "due": Date,
    "completed": boolean,
    "id": string,
    "subtasks": TaskRecord[]
}

/** 
* This class represents a Task.
*/
export class Task {
    id: string
    
    name: string
    size: number
    importance: number
    category: string
    due: Date
    completed: boolean

    private taskMgr: TaskManager
    private _subtasks: Task[] = []
    private _parent: Task | null = null

    get subtasks(): Task[] {
        return [...this._subtasks]
    }

    get parent(): Task | null {
        return this._parent
    }

    set parent(task: Task) {
        if (this._parent == null) {
            this._parent = task
        }
    }

    // Deprecated
    get children(): string[] {
        return this._subtasks.map(t => t.id)
    }

    get parentId(): string | null {
        return this._parent != null ? this._parent.id : null
    }
    // End Dep.


    get hasSubtasks() : boolean {
        return this._subtasks.length > 0
    }

    get isSubtask() : boolean {
        return this._parent != null
    }
    
    /**
     * How many days until this task is due (rounded DOWN to nearest integer)
     */
    public get dueIn() {
        var due = new Date(this.due.getFullYear(), this.due.getMonth(), this.due.getDate())
        var now = new Date()
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return Math.floor((due.valueOf() - today.valueOf()) / 84_600_000)
    }

    deleted: boolean = false

    completeCallback: (() => void) | null = null
    deleteCallback: (() => void) | null = null

    private elements: HTMLElement[] = []

    /**
     * The Task's default constructor. Should be called mainly by UI callbacks
     * and the Storage Manager.
     * @param name The Task's Name
     * @param size The Task's Size [0, 5)
     * @param importance The Task's Importance [0, 5)
     * @param category Arbitrary category string
     * @param due The date the Task is due
     * @param completed If the Task is completed (default: false)
     * @param id The Task's unique ID, if any (default: generates new)
     * @param children A list of *strings*--other Tasks' IDs--of child Tasks
     * @param parentId The parent Task's ID (as a *string*)
     */
    constructor(
        taskMgr: TaskManager,
        name: string, 
        size: string | number, 
        importance: string | number, 
        category: string, 
        due: Date, 
        completed: boolean = false,
        id: string | null = null,
        subtasks: TaskRecord[] = [],
        parent: Task | null = null
    ) {
        this.taskMgr = taskMgr

        this.name = name
        this.size = Number(size)
        this.importance = Number(importance)
        this.category = category
        
        this.due = new Date(due)
        this.due = new Date(this.due.getUTCFullYear(), this.due.getUTCMonth(), this.due.getUTCDate())
        this.completed = completed

        if (id == null) {
            this.id = Task.generateId()
        } else {
            this.id = id
        }

        this._subtasks = subtasks.map(
            o => new Task(
                taskMgr,
                o.name,
                o.size,
                o.importance,
                o.category,
                o.due,
                o.completed,
                o.id,
                o.subtasks,
                this
            )
        )
        this._parent = parent
    }

    static generateId() {
        return padWithLeftZeroes(`${Math.round(999999 * Math.random())}`, 6)
    }

    /**
     * Returns an Object a la-Map which can be encoded and saved to the disk.
     * @returns An Object
     */
    toBasicObject(): TaskRecord {
        return {
            "name": this.name,
            "size": this.size,
            "importance": this.importance,
            "category": this.category,
            "due": this.due,
            "completed": this.completed,
            "id": this.id,
            "subtasks": this._subtasks.map(t => t.toBasicObject())
        }
    }

    /**
     * Makes a Task a child/subtask of this one. (Updates both Tasks'
     * attributes)
     * @param task The Task to adopt
     */
    adoptChild(task: Task) {
        if (task.parent != null) {
            return
        }

        task.parent = this
        this._subtasks.push(task)

        window.dispatchEvent(TaskChanged)
    }

    /**
     * Deletes the Task from both the TaskManager and removes all the relevant
     * elements.
     */
    delete() {
        while (this.elements.length > 0) {
            var element = this.elements.pop()!
            element.style.display = "none"
            element.remove()
        }

        this.deleted = true

        if (this.deleteCallback != null) {
            this.deleteCallback()
        }
        this.taskMgr.refresh()

        this._subtasks.forEach(sub => {
            sub.delete()
        })

        window.dispatchEvent(TaskChanged)
    }

    /**
     * Sets the Task as completed. Updates all HTML elements.
     */
    toggleCompleted() {
        if (!this.completed) {
            this.elements.forEach(element => {
                element.className += " completed"
            })
        } else {
            this.elements.forEach(element => {
                element.className = element.className.replace(" completed", "")
            })
        }

        this.completed = !this.completed

        if (this.completeCallback != null) {
            this.completeCallback()
        }
        this.taskMgr.refresh()

        window.dispatchEvent(TaskChanged)
    }

    /**
     * Removes the the elements list all Elements that have been deleted
     * from their parent container.
     */
    private cleanUpElements() {
        var newElements = []
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (element.parentElement == null) {
                element.remove()
                continue
            }
            
            newElements.push(element)
        }
        this.elements = newElements
    }

    /**
     * Returns a div element of class "task" in the style of those on the Tasks
     * tab.
     * @param full True: full length Element, with Category, Size, etc. False:
     * shortened Element with only name and due date.
     * @returns Div element of class "task"
     */
    private getTaskListLikeElement(full: boolean): HTMLDivElement {
        this.cleanUpElements()

        var newElement = document.createElement("div")
        newElement.className = this.completed ? "task completed": "task"
        if (full) {
            newElement.innerHTML = `
            <button class="complete"></button>
            <div style="min-width: 50%; min-width: 50%;">
                ${this.name}
            </div>
            <div style="min-width: 10%; max-width: 10%;">
                ${this.category}
            </div>
            <div style="min-width: 7.5%; max-width: 7.5%;">
                ${TaskSizes[this.size]}
            </div>
            <div style="min-width: 12.5%; min-width: 12.5%;">
                ${TaskImportances[this.importance]}
            </div>
            <div style="min-width: 16%; max-width: 16%;">
                ${this.due.toDateString()}
            </div>
            <button style="background: none; border: 0; text-decoration: none;" class="deletetask">
                🗑️
            </button>
            `
        } else {
            newElement.innerHTML = `
            <button class="complete"></button>
            <div style="min-width: 60%; max-width: 60%">
                ${this.name}
            </div>
            <div style="min-width: 26%; max-width: 26%">
                ${this.due.toDateString()}
            </div>
            <button style="background: none; border: 0; text-decoration: none;" class="deletetask">
                🗑️
            </button>
            `
        }
        
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

        this.elements.push(newElement)
        return newElement
    }

    /**
     * Returns the HTML Element representing this task for the Tasks tab.
     * @returns A <div class="task"> HTML Element
     */
    getTaskListElement() {
        return this.getTaskListLikeElement(true)
    }
    
    /**
     * Returns the HTML Element representing this task for the Task Planner
     * tab.
     * @returns A <div class="task"> HTML Element with fewer details.
     */
    getTaskPlannerListElement() {
        return this.getTaskListLikeElement(false)
    }

    /**
     * Returns the HTML Element representing this task for the Planner tab
     * @returns A <p> HTML Element with a square checkbox.
     */
    getPlannerElement() {
        this.cleanUpElements()

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

        this.elements.push(newElement)
        return newElement
    }
}

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
