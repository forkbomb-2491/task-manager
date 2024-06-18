import { TaskManager } from "./main";
import { Task, TaskView } from "./task";
import { WEEKDAY_STRINGS, Weekdays, findFirstPrecedingDay, isSameDay } from "./utils";


export class TaskPlanner implements TaskView {
    private calStartDate: Date = new Date()

    private selectedTask: Task | null = null

    private dayColumns: CalendarDayColumn[] = []

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
    }

    private clearDayElements() {
        for (let i = 0; i < 7; i++) {
            const element = document.getElementById(`${TaskPlanDays[i]}`)!
            element.innerHTML = `${WEEKDAY_STRINGS[i].slice(0, 3)}`
        }
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

    render(): void {
        this.clearDayElements()

        for (let i = 0; i < this.dayColumns.length; i++) {
            const col = this.dayColumns[i];
            col.render()
        }

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
            
            var element = document.createElement("div")
            element.className = "tpdate"
            element.innerHTML = `${month + 1}/${date.getDate()}`
            
            day!.appendChild(element)

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

        var selector = document.getElementById("tptask")!
        selector.innerHTML = ""

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            var element = document.createElement("option")
            element.setAttribute("name", task.id)
            element.innerHTML = task.name

            selector.appendChild(element)
        }
    }

    addTask(t: Task): void {
        if (this.selectedTask != null && t.parentId == t.id) {
            // Add
        } else {
            this.refresh()
        }
    }
}

class CalendarDayColumn implements TaskView {
    private taskMgr: TaskManager

    private calStartDate: Date
    private day: Weekdays

    private element: HTMLDivElement

    constructor(taskMgr: TaskManager, day: Weekdays, calStartDate: Date) {
        this.taskMgr = taskMgr

        this.day = day

        // Trusts the caller that they're passing the first day of the month
        this.calStartDate = calStartDate 

        // @ts-ignore (force div)
        this.element = document.getElementById(TaskPlanDays[day])!

        var container = document.getElementsByClassName("tpcalendar")[0]
        container.appendChild(this.element)
    }

    addTask(task: Task) {
        return
    }

    render() {
        var date = new Date(this.calStartDate)
        var month = this.calStartDate.getMonth()

        if (this.calStartDate.getDay() != this.day) {
            date = findFirstPrecedingDay(this.calStartDate, this.day)
        }

        while (date.getMonth() <= month) {
            if (date.getMonth() < month) {
                var element = document.createElement("div")
                element.className = "tpspacer"
            } else {
                var element = document.createElement("div")
                element.className = "tpdate"
                element.innerHTML = `${month + 1}/${date.getDate()}`
            }
            this.element.appendChild(element)

            date = new Date(date.valueOf() + 7 * 86_400_000)
        }
    }

    refresh() {}
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