import { padWithLeftZeroes } from "./utils"

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

export enum TaskEventType {
    "delete",
    "edit",
    "complete",
    "uncomplete",
    "add",
    "adopt"
}

export class TaskEvent extends Event {
    private _task: TaskRecord
    get task(): TaskRecord { return this._task }

    constructor(type: TaskEventType, task: TaskRecord) {
        var typeString: string
        switch (type) {
            case TaskEventType.delete:
                typeString = "taskdelete"
                break;
        
            case TaskEventType.edit:
                typeString = "taskedit"
                break;
        
            case TaskEventType.complete:
                typeString = "taskcomplete"
                break;
        
            case TaskEventType.uncomplete:
                typeString = "taskuncomplete"
                break;
        
            case TaskEventType.add:
                typeString = "taskadd"
                break;
        
            case TaskEventType.adopt:
                typeString = "taskadopt"
                break;
        
            default:
                break;
        }
        super(typeString!)

        this._task = task
    }
}

export function onTaskDelete(cb: (event: TaskEvent) => void) {
    // @ts-ignore
    window.addEventListener(
        "taskdelete",
        cb
    )
}

export function onTaskEdit(cb: (event: TaskEvent) => void) {
    // @ts-ignore
    window.addEventListener(
        "taskedit",
        cb
    )
}

export function onTaskComplete(cb: (event: TaskEvent) => void) {
    // @ts-ignore
    window.addEventListener(
        "taskcomplete",
        cb
    )
}

export function onTaskUncomplete(cb: (event: TaskEvent) => void) {
    // @ts-ignore
    window.addEventListener(
        "taskuncomplete",
        cb
    )
}

export function onTaskAdd(cb: (event: TaskEvent) => void) {
    // @ts-ignore
    window.addEventListener(
        "taskadd",
        cb
    )
}

export function onTaskAdopt(cb: (event: TaskEvent) => void) {
    // @ts-ignore
    window.addEventListener(
        "taskadopt",
        cb
    )
}

export function onTaskEvent(cb: (event: TaskEvent) => void, includeAdd: boolean = false, includeAdopt: boolean = false) {
    onTaskDelete(cb)
    onTaskEdit(cb)
    onTaskComplete(cb)
    onTaskUncomplete(cb)
    if (includeAdd) onTaskAdd(cb)
    if (includeAdopt) onTaskAdopt(cb)
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

    private _subtasks: Task[] = []
    private _parent: Task | null = null

    get subtasks(): Task[] { return [...this._subtasks] }

    get parent(): Task | null { return this._parent }
    set parent(task: Task) {
        if (this._parent == null) {
            this._parent = task
        }
    }

    get record(): TaskRecord {
        return {
            "name": this.name,
            "size": this.size,
            "importance": this.importance,
            "category": this.category,
            "due": this.due,
            "completed": this.completed,
            "id": this.id,
            "subtasks": this._subtasks.filter(t => !t.deleted).map(t => t.toBasicObject())
        }
    }

    // Deprecated
    get children(): string[] { return this._subtasks.map(t => t.id) }
    get parentId(): string | null { return this._parent != null ? this._parent.id : null }
    // End Dep.

    get hasSubtasks() : boolean { return this._subtasks.length > 0 }

    get isSubtask() : boolean { return this._parent != null }
    
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

    // completeCallback: (() => void) | null = null
    // deleteCallback: (() => void) | null = null

    private elements: HTMLElement[] = []

    get plannerElement(): HTMLParagraphElement {
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

    get taskListElement(): HTMLDivElement {
        var ownTaskElement = this.getTaskListLikeElement(true)
        var newContainer = document.createElement("div")
        newContainer.className = "taskcontainer"
        newContainer.setAttribute("name", this.id)
        var subtaskContainer = document.createElement("div")
        subtaskContainer.className = "subtaskcontainer"
        this._subtasks.forEach(st => {
            subtaskContainer.appendChild(st.taskListElement)
        })
        newContainer.appendChild(ownTaskElement)
        newContainer.appendChild(subtaskContainer)
        this.elements.push(newContainer)
        return newContainer
    }

    get shortenedTaskListElement(): HTMLDivElement {
        return this.getTaskListLikeElement(false)
    }

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
        return this.record
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

        this.elements.forEach(element => {
            if (element.className == "taskcontainer") {
                element.children[1].appendChild(task.taskListElement)
            }
        })

        window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record))
        window.dispatchEvent(new TaskEvent(TaskEventType.adopt, task.record))
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
        window.dispatchEvent(new TaskEvent(TaskEventType.delete, this.record))

        this._subtasks.forEach(sub => {
            sub.delete()
        })
    }

    /**
     * Sets the Task as completed. Updates all HTML elements.
     */
    toggleCompleted() {
        if (!this.completed) {
            this.elements.forEach(element => {
                if (element.className == "taskcontainer") {
                    element.children[0].className += " completed"
                } else {
                    element.className += " completed"
                }
            })
        } else {
            this.elements.forEach(element => {
                if (element.className == "taskcontainer") {
                    element.children[0].className = element.children[0].className.replace(" completed", "")
                } else {
                    element.className = element.className.replace(" completed", "")
                }
            })      
        }
        
        this.completed = !this.completed
        if (this.completed) {
            window.dispatchEvent(new TaskEvent(TaskEventType.complete, this.record))
        } else {
            window.dispatchEvent(new TaskEvent(TaskEventType.uncomplete, this.record))
        }
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
            <div style="display: flex; flex-grow: 1">
                <div style="flex-grow: 1">
                    ${this.name}
                </div>
                <div style="min-width: 9ch; max-width: 9ch;">
                    ${this.category}
                </div>
                <div style="min-width: 10ch; max-width: 10ch;">
                    ${TaskSizes[this.size]}
                </div>
                <div style="min-width: 13ch; min-width: 13ch;">
                    ${TaskImportances[this.importance]}
                </div>
                <div style="min-width: 17ch; max-width: 17ch;">
                    ${this.due.toDateString()}
                </div>
            </div>
            <button style="background: none; border: 0; text-decoration: none;" class="deletetask">
                🗑️
            </button>
            `
        } else {
            newElement.innerHTML = `
            <button class="complete"></button>
            <div style="display: flex; flex-grow: 1;">
                <div style="flex-grow: 1">
                    ${this.name}
                </div>
                <div style="min-width: 9ch; max-width: 9ch;">
                    ${TaskSizes[this.size]}
                </div>
                <div style="min-width: 15ch; max-width: 15ch;">
                    ${this.due.toDateString()}
                </div>
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
        return newElement
    }

    /**
     * Returns the HTML Element representing this task for the Tasks tab.
     * @returns A <div class="task"> HTML Element
     */
    getTaskListElement() {
        const newElement = this.getTaskListLikeElement(true)
        this.elements.push(newElement)
        return newElement
    }
    
    /**
     * Returns the HTML Element representing this task for the Task Planner
     * tab.
     * @returns A <div class="task"> HTML Element with fewer details.
     */
    getTaskPlannerListElement() {
        const newElement = this.getTaskListLikeElement(false)
        this.elements.push(newElement)
        return newElement
    }

    /**
     * Returns the HTML Element representing this task for the Planner tab
     * @returns A <p> HTML Element with a square checkbox.
     */
    getPlannerElement() {
        return this.plannerElement
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