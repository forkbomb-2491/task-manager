import { TaskManager } from "./main";
import { Task, TaskView } from "./task";
import { WEEKDAY_STRINGS, getFirstSelected, isSameDay, onTasksChanged } from "./utils";


export class TaskPlanner implements TaskView {
    private calStartDate: Date = new Date()
    private dates: TaskPlannerDate[] = []

    private selectedTask: Task | null = null

    filter: (t: Task) => boolean = _ => true

    private taskMgr: TaskManager

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
        
        this.calStartDate = new Date()
        this.calStartDate.setDate(1)

        document.getElementById("tpsizefilter")!.addEventListener(
            "change",
            _ => this.updateFilter()
        )

        document.getElementById("tpimportancefilter")!.addEventListener(
            "change",
            _ => this.updateFilter()
        )

        document.getElementById("tpsubtaskcreate")!.addEventListener(
            "submit",
            e => this.createSubtaskCallback(e)
        )

        onTasksChanged(() => { this.refresh(); console.log("tp 37") })

        var taskSelect = document.getElementById("tptask")!
        taskSelect.addEventListener(
            "change",
            e => {
                var task = this.taskMgr.getTask(
                    // @ts-ignore
                    getFirstSelected(e.currentTarget)!.getAttribute("name")!
                )
                this.selectTask(task!)
            }
        )
    }

    private clearDayElements() {
        for (let i = 0; i < 7; i++) {
            const element = document.getElementById(`${TaskPlanDays[i]}`)!
            element.innerHTML = `${WEEKDAY_STRINGS[i].slice(0, 3)}`
        }
        this.dates = []
    }

    private updateFilter() {
        var sizeSelector = document.getElementById("tpsizefilter")!
        var sizeOption = [...sizeSelector.children].filter(e => {
            // @ts-ignore
            return e.selected
        })[0]
        var size = Number(sizeOption.getAttribute("name"))

        var importanceSelector = document.getElementById("tpimportancefilter")!
        var importanceOption = [...importanceSelector.children].filter(e => {
            // @ts-ignore
            return e.selected
        })[0]
        var importance = Number(importanceOption.getAttribute("name"))

        this.filter = t => {
            return t.importance >= importance && t.size >= size
        }
        this.refresh()
    }

    private createSubtaskCallback(event: SubmitEvent) {
        event.preventDefault()

        if (this.selectedTask == null) { return }

        // @ts-ignore; Necessary to make this whole darn thing work
        var form: HTMLFormElement = event.target
        var title = form.titleinput.value
        var date = form.deadlineinput.valueAsDate
    
        var task = new Task(
            title, 
            0, // Size presumed to be tiny
            this.selectedTask.importance, // Inherit importance
            this.selectedTask.category, // Inherit category
            date, 
            false
        )
        this.selectedTask.adoptChild(task)
        this.taskMgr.addTask(task)
    }

    private selectTask(task: Task) {
        this.selectedTask = task
        if (this.dates.length > 0) {
            for (let i = 0; i < this.dates.length; i++) {
                const date = this.dates[i];
                date.selectedTask = task
            }
        }
    }

    render(): void {
        this.clearDayElements()

        this.updateFilter()
        var date = new Date(this.calStartDate)
        var month = date.getMonth()
        
        for (let i = 0; i < date.getDay(); i++) {
            var day = document.getElementById(`${TaskPlanDays[i]}`)

            var element = document.createElement("div")
            element.className = "tpspacer"

            day!.appendChild(element)
        }

        while (date.getMonth() == month) {
            var day = document.getElementById(`${TaskPlanDays[date.getDay()]}`)
            
            const newDate = new TaskPlannerDate(this.taskMgr, this.selectedTask, date);
            this.dates.push(newDate)
            newDate.render()

            date = new Date(date.valueOf() + 86_400_000)
        }

        this.updateFilter()
    }

    refresh(): void {
        var tasks = this.taskMgr.getTasks().filter(t => {
            return !t.completed && !t.deleted && this.filter(t)
        })

        if (this.selectedTask != null) {
            if (this.selectedTask.hasSubtasks) {
                // Render subtasks
            }
        }

        this.dates.forEach(date => {
            date.refresh()
        });

        var selector = document.getElementById("tptask")!
        selector.innerHTML = ""

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            var element = document.createElement("option")
            element.setAttribute("name", task.id)
            element.innerHTML = task.name

            if (this.selectedTask == task) {
                element.selected = true
            }

            selector.appendChild(element)
        }

        if (tasks.length > 0 && (this.selectedTask == null || !tasks.includes(this.selectedTask!))) {
            this.selectTask(tasks[0])
        }
    }

    addTask(t: Task): void {
        if (this.selectedTask != null && t.parentId == this.selectedTask.id) {
            var subtaskList = document.getElementById("tpsubtasklist")!
            subtaskList.appendChild(t.getTaskListElement())

            for (let i = 0; i < this.dates.length; i++) {
                const date = this.dates[i];
                date.addTask(t)
            }
        } else {
            this.refresh()
        }
    }
}

class TaskPlannerDate implements TaskView {
    private taskMgr: TaskManager
    private _selectedTask: Task | null
    private _date: Date

    get date(): Date {
        return new Date(this._date)
    }

    get selectedTask(): Task | null {
        return this._selectedTask
    }

    set selectedTask(t: Task) {
        this._selectedTask = t
        this.refresh()
    }

    set date(value: Date) {
        this._date = value
        this.render()
    }

    private element: HTMLDivElement
    private hoverElement: HTMLElement | null = null

    constructor(taskMgr: TaskManager, selectedTask: Task | null, date: Date) {
        this.taskMgr = taskMgr
        this._selectedTask = selectedTask
        this._date = date

        this.element = document.createElement("div")
        this.element.className = "tpdate"

        var container = document.getElementById(TaskPlanDays[date.getDay()])!
        container.appendChild(this.element)

        this.element.addEventListener(
            "mouseenter",
            () => this.onHover()
        )

        this.element.addEventListener(
            "mouseleave",
            () => this.onHover(false)
        )

        this.createHoverElement()
    }

    private onHover(hovered: boolean = true) {
        if (/*this.element.className == "tpdate hastask" &&*/ hovered) {
            this.hoverElement!.style.display = "block"
        } else if (!hovered) {
            this.hoverElement!.style.display = "none"
        }
    }

    private createHoverElement() {
        if (this.hoverElement != null) {
            this.hoverElement.remove()
            this.hoverElement = null
        }

        this.hoverElement = document.createElement("div")
        this.hoverElement.className = "tpdate hastask"

        this.hoverElement.style.position = "absolute"
        this.hoverElement.style.display = "none"

        this.hoverElement.innerHTML = "urmommmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm"

        this.element.appendChild(this.hoverElement)
    }

    addTask(task: Task) {
        if (!isSameDay(task.due, this.date)) {
            return
        }
        this.element.appendChild(task.getPlannerElement())
        this.refresh()
    }

    render() {
        this.element.innerHTML = `${this._date.getMonth() + 1}/${this._date.getDate()}`
        if (this.hoverElement != null) this.element.appendChild(this.hoverElement)

        if (this.selectedTask != null) {
            for (let i = 0; i < this.selectedTask.children.length; i++) {
                const child = this.taskMgr.getTask(this.selectedTask.children[i])
                if (child == null || child.deleted) continue
                if (isSameDay(this._date, child.due)) {
                    this.element.appendChild(child.getPlannerElement())
                }
            }
        }

        this.refresh()
    }

    refresh() {
        if (this.element.children.length > 1) {
            this.element.className = "tpdate hastask"
        } else {
            this.element.className = "tpdate"
        }
    }
}

enum TaskPlanDays {
    "tpsun",
    "tpmon",
    "tptue",
    "tpwed",
    "tpthu",
    "tpfri",
    "tpsat"
}