import { Weekdays, DayCols, WEEKDAY_STRINGS } from "./utils"
import { savePlannerFlip } from "./storage"
import { Task, TaskView } from "./task"
import { TaskManager } from "./main"

const isSameDay = (d1: Date, d2: Date) => {
    return (d1.getFullYear() == d2.getFullYear() &&
    d1.getMonth() == d2.getMonth() &&
    d1.getDate() == d2.getDate())
}

/**
 * The TaskView that represents the Planner tab.
 */
export class Planner implements TaskView {
    private startDate: Date
    private taskMgr: TaskManager

    private dayColumns: DayColumn[] = []

    constructor(taskMgr: TaskManager, startDay: Weekdays = Weekdays.sunday) {
        this.taskMgr = taskMgr

        var today = new Date()
        this.startDate = findFirstPrecedingDay(today, startDay)

        for (let i = 0; i < 7; i++) {
            this.dayColumns.push(new DayColumn(this.taskMgr, today))
        }
    }

    render() {
        var date = new Date(this.startDate.valueOf())
        for (let index = 0; index < this.dayColumns.length; index++) {
            const col = this.dayColumns[index];
            col.date = date
            date = new Date(date.valueOf() + 86_400_000)
        }
    }

    refresh() {
        for (let index = 0; index < this.dayColumns.length; index++) {
            const col = this.dayColumns[index];
            col.refresh()
        }
    }

    addTask(task: Task) {
        for (let index = 0; index < this.dayColumns.length; index++) {
            const col = this.dayColumns[index];
            if (isSameDay(col.date, task.due)) {
                col.addTask(task)
                return
            }
        }
    }
}

/**
 * Represents the Planner's Day Columns. This View handles rendering and
 * displaying the day's tasks.
 */
class DayColumn implements TaskView {
    private taskMgr: TaskManager
    private _date: Date

    get date(): Date {
        return new Date(this._date)
    }

    set date(value: Date) {
        this._date = value
        this.render()
    }

    private element: HTMLDivElement

    constructor(taskMgr: TaskManager, date: Date) {
        this.taskMgr = taskMgr
        this._date = date

        this.element = document.createElement("div")
        this.element.className = "daycolumn"
        this.element.id = DayCols[date.getDay()]

        var container = document.getElementsByClassName("plannercontainer")[0]
        container.appendChild(this.element)
    }

    addTask(task: Task) {
        this.element.appendChild(task.getPlannerElement())
    }

    render() {
        this.element.innerHTML = ""

        var heading = document.createElement("h4")
        heading.innerHTML = WEEKDAY_STRINGS[this._date.getDay()]
        this.element.appendChild(heading)

        var tasks = this.taskMgr.getTasks().filter((t) => {
            return isSameDay(this._date, t.due)
        }, this)
        for (let index = 0; index < tasks.length; index++) {
            const task = tasks[index];
            this.element.appendChild(task.getPlannerElement())
        }

        this.refresh()
    }

    refresh() {
        if (isSameDay(new Date(), this._date)) {
            this.element.className = "daycolumn today"
        } else {
            this.element.className = "daycolumn"
        }
    }
}

export function addPlannerTask(task: HTMLElement, dayId: string) {
    const day = document.getElementById(dayId)
    day?.appendChild(task)
}

export function switchPlannerOrientation() {
    var previousElement = document.getElementById("plannervertical")
    if (previousElement != null) {
        previousElement.remove()
        savePlannerFlip(false)
        return
    }
    var newElement = document.createElement("style")
    newElement.id = "plannervertical"
    newElement.innerHTML = `
    .plannercontainer {
        flex-direction: column;
    }
    
    .daycolumn {
        flex-grow: 1;
        width: unset;
        min-height: unset;
        margin-bottom: 1.25rem;
    
        column-count: 2;
    }
    
    .daycolumn h4 {
        text-align: left;
    }`
    savePlannerFlip(true)
    document.head.appendChild(newElement)
}

function findFirstPrecedingDay(date: Date, day: Weekdays) {
    console.log(`preceding weekday: ${day}`)
    var ret = new Date(date.valueOf())
    while (ret.getDay() != day) {
        ret = new Date(ret.valueOf() - 86_400_000)
    }

    return ret
}