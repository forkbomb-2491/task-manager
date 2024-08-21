import { Weekdays, DayCols, WEEKDAY_STRINGS, isSameDay, findFirstPrecedingDay, onWindowFocused, Months, getElement, showSheetElement } from "./utils"
import { Task, getColor, onTaskAdd, onTaskAdopt, onTaskEdit, onTaskEvent } from "./task"
import { TaskManager } from "./taskmanager"
import { onSettingChange } from "./settings"

/**
 * The TaskView that represents the Planner tab.
 */
export class Planner {
    private startDate: Date
    private taskMgr: TaskManager

    private _startDay: Weekdays
    
    get startDay(): Weekdays {
        return this._startDay
    }
    
    set startDay(day: Weekdays) {
        this._startDay = day
        this.centerThisWeek()
    }

    private dayColumns: DayColumn[] = []

    /**
     * Initializes the Planner class.
     * @param taskMgr the TaskManager
     * @param startDay First day of the week on Planner (default: Sunday)
     */
    constructor(taskMgr: TaskManager, startDay: Weekdays = Weekdays.sunday) {
        this.taskMgr = taskMgr
        this._startDay = startDay

        var today = new Date()
        this.startDate = findFirstPrecedingDay(today, startDay)

        for (let i = 0; i < 7; i++) {
            this.dayColumns.push(new DayColumn(this.taskMgr, today))
        }

        document.getElementById("planneryesterday")!.addEventListener(
            "click",
            (_) => this.shiftLeft(1)
        )

        document.getElementById("plannernextweek")!.addEventListener(
            "click",
            (_) => this.shiftRight(7)
        )

        document.getElementById("plannerlastweek")!.addEventListener(
            "click",
            (_) => this.shiftLeft(7)
        )

        document.getElementById("plannertomorrow")!.addEventListener(
            "click",
            (_) => this.shiftRight(1)
        )

        document.getElementById("plannerthisweek")!.addEventListener(
            "click",
            (_) => this.centerThisWeek()
        )

        onSettingChange("plannerFlipped", e => {
            if (e.value) {
                switchPlannerOrientation()
            }
        })

        onSettingChange("plannerStartDay", e => this.startDay = e.value)
        onTaskAdd(e => this.addTask(this.taskMgr.getTask(e.task.id)!))
        onTaskAdopt(e => this.addTask(this.taskMgr.getTask(e.task.id)!))
        onTaskEdit(e => {
            this.addTask(this.taskMgr.getTask(e.task.id)!)
            this.refresh()
        })

        onWindowFocused(() => this.refresh())

        SelectWeek.onWindowDispatch(e => {
            console.log("recv")
            this.startDate = e.startDate
            this.render()

            getElement("plannercalendar").style.display = "none"
            getElement("plannerweekly").style.display = "block"

            getElement("switchplanner").style.display = "block"

            getElement("plannercalbutton").innerText = "Monthly View"
        })

        getElement("plannercalbutton").addEventListener(
            "click", _ => {
                this.calendarView(getElement("plannercalendar").style.display == "none")
            }
        )

        onSettingChange("plannerInCalendar", e => this.calendarView(e.value))
    }

    private calendarView(enabled: boolean) {
        if (enabled) {
            getElement("plannercalendar").style.display = "block"
            getElement("plannerweekly").style.display = "none"

            getElement("switchplanner").style.display = "none"

            getElement("plannercalbutton").innerText = "Weekly View"
        } else {
            getElement("plannercalendar").style.display = "none"
            getElement("plannerweekly").style.display = "block"

            getElement("switchplanner").style.display = "block"

            getElement("plannercalbutton").innerText = "Monthly View"
        }
    }

    // Following 3 methods handle shifting the Planner from the UI
    private shiftLeft(nDays: number) {
        this.startDate = new Date(this.startDate.valueOf() - nDays * 86_400_000)
        this.render()
    }

    private shiftRight(nDays: number) {
        this.startDate = new Date(this.startDate.valueOf() + nDays * 86_400_000)
        this.render()
    }

    private centerThisWeek() {
        var today = new Date()
        this.startDate = findFirstPrecedingDay(today, this._startDay)
        this.render()
    }

    /**
     * Wipes Planner elements and renders them anew starting on the current
     * startDate.
     */
    render() {
        var date = new Date(this.startDate.valueOf())
        for (let index = 0; index < this.dayColumns.length; index++) {
            const col = this.dayColumns[index];
            col.date = date
            date = new Date(date.valueOf() + 86_400_000)
        }

        var differentYears = this.startDate.getFullYear() != date.getFullYear()

        document.getElementById("plannerdaterange")!.innerHTML = `${this.startDate.getMonth() + 1}/${this.startDate.getDate()}${differentYears ? `/${this.startDate.getFullYear()}` : ""} – ${date.getMonth() + 1}/${date.getDate() - 1}${differentYears ? `/${date.getFullYear()}` : ""}`
    }

    /**
     * Makes sure current date is indicated by the UI.
     */
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
class DayColumn {
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

    /**
     * Initializer for the DayColumn class
     * @param taskMgr 
     * @param date The date the column represents
     */
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
        this.element.appendChild(task.plannerElement)
    }

    /**
     * Clears contents of the HTML element and renders anew all tasks and
     * headings to make consistent with internal state. 
     */
    render() {
        this.element.innerHTML = ""
        this.element.id = DayCols[this.date.getDay()]

        var heading = document.createElement("h4")
        heading.innerHTML = WEEKDAY_STRINGS[this._date.getDay()]
        this.element.appendChild(heading)

        var dateHeading = document.createElement("h5")
        dateHeading.innerHTML = `${this.date.getMonth() + 1}/${this.date.getDate()}`
        this.element.appendChild(dateHeading)

        this.element.appendChild(document.createElement("div"))

        var tasks = this.taskMgr.getTasks().filter((t) => {
            return isSameDay(this._date, t.due) && !t.deleted
        }, this)
        for (let index = 0; index < tasks.length; index++) {
            const task = tasks[index];
            this.element.appendChild(task.getPlannerElement())
        }

        this.refresh()
    }

    /**
     * If the DayColumn's date is today (for the user), change styling.
     */
    refresh() {
        if (isSameDay(new Date(), this._date)) {
            this.element.className = "daycolumn today"
        } else {
            this.element.className = "daycolumn"
        }
        var tasksInElement: string[] = [];
        [...this.element.children].forEach(child => {
            if (child.hasAttribute("name")) {
                const taskId = child.getAttribute("name")!
                if (tasksInElement.includes(taskId)) {
                    child.remove()
                }
                tasksInElement.push(taskId)
                const task = this.taskMgr.getTask(taskId)
                if (task != null && !isSameDay(this._date, task.due)) {
                    child.remove()
                }
            }
        });
    }
}

export function addPlannerTask(task: HTMLElement, dayId: string) {
    const day = document.getElementById(dayId)
    day?.appendChild(task)
}

export function switchPlannerOrientation(): boolean {
    var previousElement = document.getElementById("plannervertical")
    if (previousElement != null) {
        previousElement.remove()
        return false
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
    }

    .daycolumn h5 {
        text-align: left;
    }
    
    `
    document.head.appendChild(newElement)
    return true
}

export class Calendar {
    private taskMgr: TaskManager
    private weeks: CalendarWeek[] = []

    private month: number
    private year: number

    private element = document.getElementById("plannercalweeks")!

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
        const today = new Date()
        this.year = today.getFullYear()
        this.month = today.getMonth()

        document.getElementById("callastmonth")!.addEventListener(
            "click",
            _ => this.shiftMonth(-1)
        )

        document.getElementById("calnextmonth")!.addEventListener(
            "click",
            _ => this.shiftMonth(1)
        )

        document.getElementById("plannerthismonth")!.addEventListener(
            "click",
            _ => {
                const today = new Date()
                this.month = today.getMonth()
                this.year = today.getFullYear()
                this.render()
            }
        )
    }

    private shiftMonth(by: number) {
        var month = this.month + (by < 0 ? -1 : 1)
        if (month < 0) {
            this.month = 11
            this.year--
        } else if (month > 11) {
            this.month = 0
            this.year++
        } else {
            this.month = month
        }

        this.render()
    }

    render() {
        var counter = 0
        this.element.innerHTML = ""
        this.weeks = []
        var date = findFirstPrecedingDay(new Date(this.year, this.month, 1), Weekdays.sunday)
        const loopCondition = () => {
            if (date.getMonth() == 0 && this.month == 11) {
                return false
            } else if (this.month == 0 && date.getMonth() == 11) {
                return true
            } else {
                return date.getMonth() <= this.month
            }
        }

        while (loopCondition() && counter < 6) {
            console.log(date.getMonth(), this.month)
            const week = new CalendarWeek(this.taskMgr, date)
            this.weeks.push(week)
            week.render()
            date = new Date(date.valueOf() + 86_400_000 * 7)
            counter++
        }
        document.getElementById("calmonthlabel")!.innerHTML = `${Months[this.month].slice(0, 3)} ${this.year}`
    }
}

class CalendarWeek {
    private taskMgr: TaskManager
    private element: Element | undefined

    private days: CalendarDay[] = []
    
    private _startDate: Date
    get startDate(): Date { return this._startDate }
    set startDate(val: Date) {
        this._startDate = val
        // this.render()
    }

    constructor(taskMgr: TaskManager, startDate: Date) {
        this.taskMgr = taskMgr
        this._startDate = startDate
    }
    
    private createElement() {
        if (this.element != undefined) {
            this.element.remove()
        }

        this.element = document.createElement("div")
        this.element.className = "calweek"

        const button = document.createElement("button")
        button.title = "Click to select this week"
        button.onclick = _ => {
            window.dispatchEvent(new SelectWeek(this._startDate))
        }
        this.element.appendChild(button)

        document.getElementById("plannercalweeks")!.appendChild(this.element)
    }

    render() {
        // Make element
        this.createElement()
        // If start not sunday, add right num of spacers
        // Make days
        this.days = []
        var date = new Date(this._startDate)
        for (let i = 0; i < 7; i++) {
            const day = new CalendarDay(this.taskMgr, new Date(date.valueOf() + 86400000 * i), this.element!)
            this.days.push(day)
            day.render()
        }
    }
}

class CalendarDay {
    private taskMgr: TaskManager
    private parentElement: Element
    private element: Element | undefined
    private clickListenerAdded: boolean = false
    
    private date: Date

    constructor(taskMgr: TaskManager, date: Date, parent: Element) {
        this.taskMgr = taskMgr
        this.date = date
        this.parentElement = parent

        onTaskEvent(e => {
            if (this.element!.matches(":hover")) {
                return
            }
            if (
                isSameDay(new Date(e.task.due), this.date) || 
                (e.previous != null && isSameDay(new Date(e.previous!.due), this.date))
            ) {
                this.render()
            }
        })

        onWindowFocused(() => this.checkIsToday())
    }

    private getTaskCheckbox(task: Task, disabled: boolean = false): HTMLLabelElement {
        const element = document.createElement("label")
        element.className = "checkcontainer"
        element.title = task.name
        
        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.checked = task.completed
        if (!disabled) {
            checkbox.addEventListener("change", _ => {
                task.completed = checkbox.checked
            })
        } else {
            checkbox.disabled = true
        }
        element.appendChild(checkbox)

        const checkmark = document.createElement("span")
        checkmark.className = "taskcheckbox"
        checkmark.style.backgroundColor = getColor(task.color)
        checkmark.innerHTML = "<p>✔</p>"
        element.appendChild(checkmark)

        return element
    }

    private checkIsToday() {
        if (isSameDay(this.date, new Date()) && this.element != undefined) {
            this.element.className = "caldate today"
        } else if (this.element != undefined) {
            this.element.className = "caldate"
        }
    }

    private showTaskSheet() {
        // Create element
        var element = document.createElement("div")
        // Load tasks
        var tasks = this.taskMgr.getTasks().filter(t => {
            return isSameDay(this.date, t.due)
        })
        // Add tasks to element
        tasks.forEach(t => {
            element.appendChild(t.shortenedTaskListElement)
        })
        // Show task element
        showSheetElement(this.date.toDateString(), element)
    }

    render() {
        // Check element exists, if not create & append
        if (this.element != undefined) {
            // clear inner HTML
            this.element.innerHTML = ""
        } else {
            this.element = document.createElement("div")
            this.element.className = "caldate"

            this.parentElement.appendChild(this.element)
        }
        // add date label
        this.element.innerHTML += `<p>${this.date.getMonth() + 1}/${this.date.getDate()}</p>`
        // filter tasks
        var tasks = this.taskMgr.getTasks().filter(t => {
            return isSameDay(this.date, t.due)
        })
        // add checkboxes
        tasks.forEach(t => {
            this.element!.appendChild(this.getTaskCheckbox(t))
        })

        this.checkIsToday()
        if (!this.clickListenerAdded) {
            this.element.addEventListener("click", _ => this.showTaskSheet())
            this.clickListenerAdded = true
        }
    }
}

class SelectWeek extends Event {
    readonly startDate: Date
    private static event: string = "planner://selectweek"

    constructor(date: Date) {
        super(SelectWeek.event)
        this.startDate = date
    }

    static onWindowDispatch(cb: (e: SelectWeek) => void) {
        // @ts-ignore
        window.addEventListener(SelectWeek.event, cb)
    }
}