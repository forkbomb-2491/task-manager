import { v4 as uuid4 } from 'uuid'
import { isMobile, padWithLeftZeroes, toHTMLDateTimeString } from "./utils"

export type TaskRecord = {
    "name": string,
    "size": number,
    "importance": number,
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

    readonly listUUID: string | null

    constructor(type: TaskEventType, task: TaskRecord, listUUID: string | null = null) {
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
        this.listUUID = listUUID
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

export type ListRecord = {
    name: string,
    uuid: string,
    color: TaskColor,
    tasks: TaskRecord[]
}

export function onListEdit(cb: () => void) {
    window.addEventListener(
        "listedited",
        _ => cb()
    )
}

export class List {
    readonly uuid: string

    private _name: string
    get name(): string { return this._name }
    set name(val: string) {
        this._name = val
        window.dispatchEvent(new Event("listedited"))
    }

    readonly color: TaskColor

    private _tasks: Task[] = []
    get tasks(): Task[] {
        return [...this._tasks]
    }

    get record(): ListRecord {
        return {
            name: this._name,
            uuid: this.uuid,
            color: this.color,
            tasks: this._tasks.filter(t => !t.deleted).map(t => t.record)
        }
    }

    constructor(name: string, color: TaskColor, tasks: Task[] = [], uuid: string | null = null) {
        if (uuid == null) {
            this.uuid = uuid4()
        } else {
            this.uuid = uuid
        }

        this._name = name
        this.color = color
        this._tasks = tasks
        this._tasks.forEach(
            t => {
                t.category = String(TaskColor[color])
                t.list = this.uuid
            }
        )
    }

    static fromRecord(record: ListRecord): List {
        return new List(
            record.name,
            record.color,
            record.tasks.map(t => Task.fromRecord(t)),
            record.uuid,
        )
    }

    public addTask(task: Task) {
        this._tasks.push(task)
        task.category = String(TaskColor[this.color])
        task.list = this.uuid
        window.dispatchEvent(new TaskEvent(TaskEventType.add, task.record, this.uuid));
    }
}

/** 
* This class represents a Task.
*/
export class Task {
    id: string
    
    private _name: string
    get name(): string { return this._name }
    set name(val: string) { 
        this._name = val
        this.refreshElements()
        window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record))
    }

    private _size: number
    get size(): number { return this._size }
    set size(val: number) { 
        this._size = val
        this.refreshElements()
        window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record))
    }

    private _importance: number
    get importance(): number { return this._importance }
    set importance(val: number) { 
        this._importance = val
        this.refreshElements()
        window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record))
    }
    
    private _category: string = "Default"
    get category(): string { return this._category }
    set category(val: string) { 
        this._category = val
        this._subtasks.forEach(st => {
            st.category = val
        });
        this.refreshElements()
        // window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record))
    }

    private _list: string = ""
    get list(): string {
        return this._list
    }
    set list(val: string) {
        this._list = val
        this._subtasks.forEach(t => t.list = val)
    }
    
    private _due: Date
    get due(): Date { return this._due }
    set due(val: Date) { 
        this._due = val
        this.refreshElements()
        window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record))
    }

    private _smarted: boolean = false
    get smarted(): boolean { return this._smarted }
    set smarted(val: boolean) {
        this._smarted = val
        this.refreshElements()
    }
    
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
            "name": this._name,
            "size": this._size,
            "importance": this._importance,
            "due": this._due,
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
        var due = new Date(this._due.getFullYear(), this._due.getMonth(), this._due.getDate())
        var now = new Date()
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return Math.floor((due.valueOf() - today.valueOf()) / 84_600_000)
    }

    deleted: boolean = false

    private elements: HTMLElement[] = []

    get plannerElement(): HTMLParagraphElement {
        this.cleanUpElements()

        var newElement = document.createElement("p")
        if (this.completed) {
            newElement.className = " completed"
        }
        newElement.innerHTML = `
        <button class="complete"></button>
        ${this._name}
        `

        var completeTaskCallback = (_: Event) => { this.toggleCompleted() }

        newElement.getElementsByClassName("complete")[0].addEventListener(
            "click",
            completeTaskCallback
        )

        if (this._category != "Default") {
            newElement.style.color = getColor(this._category)
        }

        this.elements.push(newElement)
        return newElement
    }

    get taskListElement(): HTMLDivElement {
        var ownTaskElement = this.getTaskListLikeElement(true)
        var newContainer = document.createElement("div")
        newContainer.className = "taskcontainer"
        // ✏️🖉 
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
        const newElement = this.getTaskListLikeElement(false)
        this.elements.push(newElement)
        return newElement
    }

    get miniTaskListElement(): HTMLDivElement{
        const newElement = this.getMiniTaskListElement()
        this.elements.push(newElement)
        return newElement
    }

    /**
     * The Task's default constructor. Should be called mainly by UI callbacks
     * and the Storage Manager.
     * @param name The Task's Name
     * @param size The Task's Size [0, 5)
     * @param importance The Task's Importance [0, 5)
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
        due: Date, 
        completed: boolean = false,
        id: string | null = null,
        subtasks: TaskRecord[] = [],
        parent: Task | null = null
    ) {
        this._name = name
        this._size = Number(size)
        this._importance = Number(importance)
        
        this._due = new Date(due)
        // this.due = new Date(this.due.getUTCFullYear(), this.due.getUTCMonth(), this.due.getUTCDate())
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

    static fromRecord(record: TaskRecord): Task {
        return new Task(
            record.name,
            record.size,
            record.importance,
            record.due,
            record.completed,
            record.id,
            record.subtasks.map(st => Task.fromRecord(st))
        )
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

        window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record, this._list))
        window.dispatchEvent(new TaskEvent(TaskEventType.adopt, task.record, this._list))
    }

    /**
     * Deletes the Task from both the TaskManager and removes all the relevant
     * elements.
     */
    delete() {
        while (this.elements.length > 0) {
            var element = this.elements.pop()!
            // element.style.scale = "0.5"
            // window.setTimeout(() => {
                element.style.display = "none"
                element.remove()
            // }, 6000)
        }

        this.deleted = true
        window.dispatchEvent(new TaskEvent(TaskEventType.delete, this.record, this._list))

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
                    element.style.scale = "1.03"
                    window.setTimeout(() => element.style.scale = "1.0", 100)
                    element.children[0].className += " completed"
                } else {
                    element.className += " completed"
                }
            })
        } else {
            this.elements.forEach(element => {
                if (element.className == "taskcontainer") {
                    element.style.scale = "1.03"
                    window.setTimeout(() => element.style.scale = "1.0", 100)
                    element.children[0].className = element.children[0].className.replace(" completed", "")
                } else {
                    element.className = element.className.replace(" completed", "")
                }
            })      
        }
        
        this.completed = !this.completed
        if (this.completed) {
            window.dispatchEvent(new TaskEvent(TaskEventType.complete, this.record, this._list))
        } else {
            window.dispatchEvent(new TaskEvent(TaskEventType.uncomplete, this.record, this._list))
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

    private getTaskListElementHTML() {
        var ret = `
            <button class="complete"></button>
            <button class="edittask" style="background: none; border: 0; text-decoration: none;">✏️</button>
            <div style="display: flex; flex-grow: 1">
                <div style="flex-grow: 1">
                    ${this._name}
                </div>`
        if (isMobile()) {
            ret += "</div>"
        } else {
            ret += `    <div style="min-width: 10ch; max-width: 10ch;">
                    ${TaskSizes[this._size]}
                </div>
                <div style="min-width: 13ch; min-width: 13ch;">
                    ${TaskImportances[this._importance]}
                </div>
                <div style="min-width: 17ch; max-width: 17ch;">
                    <div class="overduewarning">${this.dueIn < 0 ? "⚠️ ": ""}${this._smarted ? "✨ ": ""}</div>${this._due.toDateString()}
                </div>
            </div>
            <button style="background: none; border: 0; text-decoration: none;" class="deletetask">
                🗑️
            </button>`
        }
        return ret
    }

    private getTaskPlanListElementHTML() {
        var ret = `
            <button class="complete"></button>
            <div style="display: flex; flex-grow: 1;">
                <div style="flex-grow: 1">
                    ${this._name}
                </div>`
        if (isMobile()) {
            ret += "</div>"
        } else {
            ret += `
                <div style="min-width: 9ch; max-width: 9ch;">
                    ${TaskSizes[this._size]}
                </div>
                <div style="min-width: 17ch; max-width: 17ch;">
                    <div class="overduewarning">${this.dueIn < 0 ? "⚠️ ": ""}${this._smarted ? "✨ ": ""}</div>${this._due.toDateString()}
                </div>
            </div>
            <button style="background: none; border: 0; text-decoration: none;" class="deletetask">
                🗑️
            </button>
            `
        }
        return ret
    }

    private getMiniTaskListElementHTML() {
        return `
            <div style="display: flex; flex-grow: 1;">
                <div style="flex-grow: 1;">
                    ${this._name}
                </div>
                <div style="min-width: 17ch; max-width: 17ch;">
                    <div class="overduewarning">${this.dueIn < 0 ? "⚠️ ": ""}${this._smarted ? "✨ ": ""}</div>${this._due.toDateString()}
                </div>
            </div>
            `
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
            newElement.innerHTML = this.getTaskListElementHTML()
            this.addButtonListeners(newElement, true)
        } else {
            newElement.innerHTML = this.getTaskPlanListElementHTML()
            this.addButtonListeners(newElement)
        }

        if (this._category != "Default") {
            newElement.style.color = getColor(this._category)
        }
        return newElement
    }

    private getMiniTaskListElement() {
        this.cleanUpElements()
        var newElement = document.createElement("div")
        newElement.className = this.completed ? "task completed": "task"
        newElement.innerHTML = this.getMiniTaskListElementHTML()
        // this.addButtonListeners(newElement)
        if (this._category != "Default") {
            newElement.style.color = getColor(this._category)
        }
        return newElement
    }

    private addButtonListeners(newElement: HTMLDivElement, includeEdit: boolean = false) {
        if (includeEdit && !isMobile()) {
            var editTaskCallback = (_: Event) => { this.editTask(newElement) }

            newElement.getElementsByClassName("edittask")[0].addEventListener(
                "click",
                editTaskCallback
            )
        }

        var deleteTaskCallback = (_: Event) => { this.delete() }
        var completeTaskCallback = (_: Event) => { this.toggleCompleted() }

        newElement.getElementsByClassName("complete")[0].addEventListener(
            "click",
            completeTaskCallback
        )

        if (isMobile()) return

        newElement.getElementsByClassName("deletetask")[0].addEventListener(
            "click",
            deleteTaskCallback
        )
    }

    private refreshElements() {
        this.cleanUpElements()
        var newElements = this.elements.map(e => {
            var newElement: HTMLElement
            if (e.className == "taskcontainer") {
                newElement = this.taskListElement
                newElement.style.color = getColor(this._category)
                e.replaceWith(newElement)
            } else if (e.className == "task") {
                newElement = this.shortenedTaskListElement
                newElement.style.color = getColor(this._category)
                e.replaceWith(newElement)
            } else if (e.tagName == "P") {
                newElement = this.plannerElement
                newElement.style.color = getColor(this._category)
                e.replaceWith(newElement)
            } else {
                newElement = e
                newElement.style.color = getColor(this._category)
            }
            return newElement
        })
        this.elements = newElements
    }

    private editTask(element: HTMLDivElement) {
        if (element.className.includes(" editing")) {       
            var form: HTMLFormElement = element.getElementsByTagName("form")[0]
            this._name = form.titleinput.value
            this._due = new Date(form.deadlineinput.valueAsNumber + (new Date().getTimezoneOffset() * 60_000))
            this._size = form.sizeinput.selectedOptions.item(0).getAttribute("name")
            this._importance = form.importanceinput.selectedOptions.item(0).getAttribute("name")

            window.dispatchEvent(new TaskEvent(TaskEventType.edit, this.record, this.category))

            element.className = "task"
            element.innerHTML = this.getTaskListElementHTML()
            this.addButtonListeners(element, true)
            this.refreshElements()
        } else {
            element.className += " editing"
            element.innerHTML = `
            <form class="taskeditform" name="taskcreate" autocomplete="off">
                <input type="submit" style="background: none; border: none; padding: 0; width: 1.35rem; margin-right: 0.5rem;" value="➕">
                <div style="display: flex; flex-grow: 1;">
                    <div style="flex-grow: 1;">
                        <input type = "text" name="titleinput" required value="${this._name}">
                    </div>
                    <div style="min-width: 10ch; max-width: 10ch;">
                        <select name = "sizeinput" required>
                            <option name="0" ${this._size == 0 ? "selected": ""}>Tiny</option>
                            <option name="1" ${this._size == 1 ? "selected": ""}>Small</option>
                            <option name="2" ${this._size == 2 ? "selected": ""}>Medium</option>
                            <option name="3" ${this._size == 3 ? "selected": ""}>Big</option>
                            <option name="4" ${this._size == 4 ? "selected": ""}>Huge</option>
                        </select>
                    </div>
                    <div style="min-width: 13ch; min-width: 13ch; display: flex;">
                        <select name="importanceinput" required>
                            <option name="0" ${this._importance == 0 ? "selected": ""}>Trivial</option>
                            <option name="1" ${this._importance == 1 ? "selected": ""}>Unimportant</option>
                            <option name="2" ${this._importance == 2 ? "selected": ""}>Average</option>
                            <option name="3" ${this._importance == 3 ? "selected": ""}>Important</option>
                            <option name="4" ${this._importance == 4 ? "selected": ""}>Vital</option>
                        </select>
                    </div>
                    <div style="min-width: calc(17ch + 2rem); max-width: calc(17ch + 2rem); display: flex;">
                        <input name="deadlineinput" type="datetime-local" value="${toHTMLDateTimeString(this._due)}" required>
                    </div>
                </div>
            </form>
            `
            var editTaskCallback = (_: Event) => { this.editTask(element) }
            element.getElementsByClassName("taskeditform")[0].addEventListener(
                "submit",
                e => {
                    e.preventDefault()
                    editTaskCallback(e)
                }
            )
        }
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

export enum TaskColor {
    "Default",
    "Red",
    "Orange",
    "Yellow",
    "Green",
    "Blue",
    "Purple"
}

export function colorStrToEnum(color: string) {
    switch (color) {
        case "Red":
            return TaskColor.Red
    
        case "Orange":
            return TaskColor.Orange
    
        case "Yellow":
            return TaskColor.Yellow
    
        case "Green":
            return TaskColor.Green
    
        case "Blue":
            return TaskColor.Blue
    
        case "Purple":
            return TaskColor.Purple

        default:
            return TaskColor.Default
    }
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