import { TaskManager } from "./main";
import { Task, TaskView } from "./task";
import { Months, WEEKDAY_STRINGS, getFirstSelected, isSameDay, onTasksChanged } from "./utils";


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

        document.getElementById("tplastmonth")!.addEventListener(
            "click",
            _ => this.shiftMonth(-1)
        )

        document.getElementById("tpnextmonth")!.addEventListener(
            "click",
            _ => this.shiftMonth(1)
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

        this.updateSelector()
    }

    private updateSelector() {
        // Apply filter
        var tasks = this.taskMgr.getTasks().filter(t => {
            return !t.completed && !t.deleted && this.filter(t)
        })

        // Clear selector
        var selector = document.getElementById("tptask")!
        selector.innerHTML = ""

        // Loop
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

        // Detects change or void task selection and updates accordingly
        if (tasks.length > 0 && (this.selectedTask == null || !tasks.includes(this.selectedTask))) {
            this.selectTask(tasks[0])
        }
    }

    private createSubtaskCallback(event: SubmitEvent) {
        event.preventDefault()

        if (this.selectedTask == null) { return }

        // @ts-ignore; Necessary to make this whole darn thing work
        var form: HTMLFormElement = event.target
        var title = form.titleinput.value
        var date = form.deadlineinput.valueAsDate
    
        var task = new Task(
            this.taskMgr,
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
        for (let i = 0; i < this.dates.length; i++) {
            const date = this.dates[i];
            date.selectedTask = task
        }

        var subtaskList = document.getElementById("tpsubtasklist")!
        subtaskList.innerHTML = ""
        for (let i = 0; i < task.children.length; i++) {
            const childId = task.children[i];
            const subtask = this.taskMgr.getTask(childId)
            if (subtask != null) {
                subtaskList.appendChild(subtask.getTaskPlannerListElement())
            }
        }

        var tpmaintask = document.getElementById("tpmaintaskname")
        tpmaintask!.innerHTML = task.name
        var deadlineDisplay = document.getElementById("tpdeadlinedisplay")
        deadlineDisplay!.innerHTML = task.due.toDateString()
    }

    private shiftMonth(by: number) {
        var year = this.calStartDate.getFullYear()
        var month = this.calStartDate.getMonth() + (by < 0 ? -1 : 1)
        if (month < 0) {
            this.calStartDate = new Date(year - 1, 11, 1)
        } else if (month > 11) {
            this.calStartDate = new Date(year + 1, 0, 1)
        } else {
            this.calStartDate = new Date(year, month, 1)
        }

        this.render()
    }

    render(): void {
        this.updateFilter() // Also update selector
        this.clearDayElements()

        // Assumes current calStartDate is 1st
        var date = new Date(this.calStartDate)
        var month = date.getMonth()

        document.getElementById("tpmonthlabel")!.innerHTML = `${Months[month].slice(0, 3)} ${date.getFullYear()}`
        
        // Add spacers
        for (let i = 0; i < date.getDay(); i++) {
            var day = document.getElementById(`${TaskPlanDays[i]}`)

            var element = document.createElement("div")
            element.className = "tpspacer"

            day!.appendChild(element)
        }

        // Create date ojects
        while (date.getMonth() == month) {
            // Get column
            var day = document.getElementById(`${TaskPlanDays[date.getDay()]}`)
            
            // Create new date
            const newDate = new TaskPlannerDate(this.taskMgr, this.selectedTask, date);
            this.dates.push(newDate)
            newDate.render()

            date = new Date(date.valueOf() + 86_400_000)
        }
    }

    refresh(): void {
        this.updateFilter()
    }

    addTask(t: Task): void {
        if (this.selectedTask != null && t.parentId == this.selectedTask.id) {
            var subtaskList = document.getElementById("tpsubtasklist")!
            subtaskList.appendChild(t.getTaskPlannerListElement())

            for (let i = 0; i < this.dates.length; i++) {
                const date = this.dates[i];
                date.addTask(t)
            }
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
        this.render()
    }

    private element: HTMLDivElement
    private hoverElement: HTMLDivElement

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

        onTasksChanged(() => this.refresh())

        this.hoverElement = document.createElement("div") // Nec. to get TS to shut up
        this.createHoverElement()
    }

    private onHover(hovered: boolean = true) {
        if (this.element.className == "tpdate hastask" && hovered) {
            this.element.innerHTML = ""
            this.element.appendChild(this.hoverElement)
            this.element.className = "tpspacer"

            this.hoverElement.style.minHeight = `calc(${this.element.clientHeight}px - 1rem)`
            this.hoverElement.style.minWidth = `calc(${this.element.clientWidth}px - 1rem)`
            // this.hoverElement.style.maxWidth = `calc(${this.element.clientWidth * 2}px - 1rem)`
            this.hoverElement.style.display = "block"
        } else if (!hovered) {
            this.hoverElement.style.display = "none"
            if (this.element.className == "tpspacer") {
                this.element.className = "tpdate hastask"

                this.element.innerHTML = `${this._date.getMonth() + 1}/${this._date.getDate()}`
                this.element.appendChild(this.hoverElement)
            }
        }
    }

    private createHoverElement() {
        this.hoverElement = document.createElement("div")
        this.hoverElement.className = "tphoverelement"

        this.hoverElement.style.position = "absolute"
        this.hoverElement.style.display = "none"
    }

    addTask(task: Task) {
        if (!isSameDay(task.due, this.date)) {
            return
        }
        this.hoverElement.appendChild(task.getPlannerElement())
        this.refresh()
    }

    render() {
        this.element.innerHTML = `${this._date.getMonth() + 1}/${this._date.getDate()}`
        this.hoverElement.innerHTML = ""

        if (this._selectedTask != null) {
            var childIds = this._selectedTask.children.filter(
                t => {
                    const task = this.taskMgr.getTask(t)
                    return task != null && isSameDay(this.date, task.due) && !task.deleted
                }
            )

            if (isSameDay(this._date, this._selectedTask.due)) childIds.push(this._selectedTask.id)

            var children = childIds.map(
                t => {
                    return this.taskMgr.getTask(t)!
                }
            )

            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                this.hoverElement.appendChild(child.getPlannerElement())
            }
        }

        this.refresh()
        this.element.appendChild(this.hoverElement)
    }

    refresh() {
        if (this.hoverElement.style.display != "none") {
            return
        }
        if (this.hoverElement.children.length > 0) {
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