import { List, onTaskEvent } from './task';
import { TaskManager } from "./taskmanager";
import { Task } from "./task";
import { Months, WEEKDAY_STRINGS, getFirstSelected, isSameDay, onTasksChanged, onWindowFocused, toHTMLDateTimeString } from "./utils";
import { smartDueDate } from './algorithm';

export class TaskPlanner {
    private calStartDate: Date = new Date()
    private dates: TaskPlannerDate[] = []

    private selectedList: List | null = null
    private selectedTask: Task | null = null

    private _fullCal: boolean = false
    get fullCal(): boolean {
        return this._fullCal
    }

    private set fullCal(val: boolean) {
        this._fullCal = val
        this.refresh()
    }

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

        document.getElementById("tpfullcal")!.addEventListener(
            "change",
            // @ts-ignore
            e => this.fullCal = e.currentTarget!.checked
        )

        window.addEventListener(
            "resize",
            _ => {
                this.resize(window.innerWidth)
            }
        )

        this.resize(window.innerWidth)
        
        onTaskEvent(() => { this.refresh() }, true, true)
        onWindowFocused(() => this.refresh())

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

        var taskSelect = document.getElementById("tplistfilter")!
        taskSelect.addEventListener(
            "change",
            e => {
                var list = this.taskMgr.getList(
                    // @ts-ignore
                    getFirstSelected(e.currentTarget)!.getAttribute("name")!
                )
                this.selectedList = list
                this.updateFilter()
            }
        )        
    }

    private isStacked: boolean = false
    private resize(width: number) {
        const right = document.getElementById("tprightside")!
        const left = document.getElementById("tpleftside")!
        const container = document.getElementById("taskplan")!
        const stcreatecontent = document.getElementById("subtaskcreatecontent")!


        if (this.isStacked && width > 1250) {
            container.style.flexDirection = "row"
            right.style.width = "80%"
            right.style.marginLeft = "2rem"
            right.style.marginTop = ""

            left.style.width = "30%"
            this.isStacked = false

            stcreatecontent.style.display = "inline"
        } else if (!this.isStacked && width < 1250) {
            container.style.flexDirection = "column"
            right.style.width = ""
            right.style.marginLeft = ""
            right.style.marginTop = "2rem"

            left.style.width = ""
            this.isStacked = true

            stcreatecontent.style.display = "flex"
        }
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
        
        var listSelect = document.getElementById("tplistfilter")!
        listSelect.innerHTML = ""
        var lists = this.taskMgr.lists
        
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i]
            var element = document.createElement("option")
            element.setAttribute("name", list.uuid)
            element.innerHTML = list.name
            
            if (this.selectedList != null && list.uuid == this.selectedList.uuid) {
                element.selected = true
            }
            listSelect.appendChild(element)
        }
        
        var nolist = document.createElement("option")
        nolist.setAttribute("name", "none")
        nolist.innerHTML = "All Tasks"
        listSelect.appendChild(nolist)

        if (this.selectedList == null) {
            nolist.selected = true
        }
   
        this.filter = t => {
            return t.importance >= importance && t.size >= size && (this.selectedList != null ? t.list == this.selectedList.uuid : true)
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
        var date = new Date(form.deadlineinput.valueAsNumber + (new Date().getTimezoneOffset() * 60_000))
        var size = getFirstSelected(form.sizeinput)!.getAttribute("name")!

        var box = document.getElementById("tpsubtaskcreatebox")!
        box.style.scale = "1.03"
        window.setTimeout(() => box.style.scale = "1.0", 100)
        form.reset()
        form.deadlineinput.value = toHTMLDateTimeString(new Date())
    
        var task = new Task(
            title, 
            size, // Size presumed to be tiny
            this.selectedTask.importance, // Inherit importance
            // this.selectedTask._category, // Inherit category
            date, 
            false
        )
        smartDueDate(task, this.selectedTask!.list).then(_ => this.selectedTask!.adoptChild(task))
    }

    private selectTask(task: Task) {
        this.selectedTask = task
        for (let i = 0; i < this.dates.length; i++) {
            const date = this.dates[i];
            date.selectedTask = task
        }

        var subtaskList = document.getElementById("tpsubtasklist")!
        subtaskList.innerHTML = ""

        task.subtasks.forEach(task => {
            subtaskList.appendChild(task.getTaskPlannerListElement())
        })

        var tpmaintask = document.getElementById("tpmaintaskname")
        tpmaintask!.innerHTML = task.name
        var deadlineDisplay = document.getElementById("tpdeadlinedisplay")
        deadlineDisplay!.innerHTML = task.due.toDateString()

        this.refresh()
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
            const newDate = new TaskPlannerDate(this.taskMgr, this, this.selectedTask, date);
            this.dates.push(newDate)
            newDate.render()

            date = new Date(date.valueOf() + 86_400_000)
        }
    }

    refresh(): void {
        this.updateFilter()
        this.dates.forEach(date => {
            date.render()
        })
        if (this.selectedTask == null) return
        var subtaskList = document.getElementById("tpsubtasklist")!
        subtaskList.innerHTML = ""
        this.selectedTask!.subtasks.sort((a, b) => {
            return a.due.valueOf() - b.due.valueOf()
        }).forEach(st => {
            if (st.deleted) return
            subtaskList.appendChild(st.shortenedTaskListElement)
        })

        // Completion
        var tpprogress = document.getElementById("tpprogress")!
        tpprogress.innerHTML = ""
        if (this.selectedTask.subtasks.length>0) {
            var completedsum = 0;
            var totalsum = 0;
            this.selectedTask.subtasks.forEach(st =>{
                if (st.completed) {completedsum += (st.size+1)}
                totalsum += (st.size+1)
            })
            tpprogress.innerHTML = (String(((completedsum/totalsum)*100).toFixed()) + "%")
        }
        else {
            if (this.selectedTask.completed){
                tpprogress.innerHTML = "100%"
            } else (
                tpprogress.innerHTML = "0%"

            )
        }
    }
}

class TaskPlannerDate {
    private taskMgr: TaskManager
    private taskPlan: TaskPlanner
    private _selectedTask: Task | null
    private _date: Date

    private label: string | undefined

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

    constructor(taskMgr: TaskManager, taskPlan: TaskPlanner, selectedTask: Task | null, date: Date) {
        this.taskMgr = taskMgr
        this.taskPlan = taskPlan
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
            if (this.hoverElement.children.length == 0) return
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

                this.element.innerHTML = this.label! + "<br>"
                this.addCheckboxes();
                this.element.appendChild(this.hoverElement)
            }
        }
    }

    private addCheckboxes() {
        for (let i = 0; i < this.hoverElement.children.length; i++) {
            const st = this.hoverElement.children[i]
            this.element.innerHTML += `
                <label class="checkcontainer">
                    <input type="checkbox" ${st.className.includes('completed') ? "checked": ""} disabled>
                    <span class="taskcheckbox project">
                        <p>✔</p>
                    </span>
                </label>
                `;
        }
        if (this.taskPlan.fullCal) {
            this.element.innerHTML += "<br>";
            var count = 0
            this.getFullCalTasks().forEach(t => {
                count++
                if (count <= 6) {

                    this.element.innerHTML += `
                    <label class="checkcontainer">
                        <input type="checkbox" ${t.completed ? "checked": ""} disabled>
                        <span class="taskcheckbox nonproject">
                            <p>✔</p>
                        </span>
                    </label>
                    `;
                }
            })
        }
    }

    private createHoverElement() {
        this.hoverElement = document.createElement("div")
        this.hoverElement.className = "tphoverelement"

        this.hoverElement.style.position = "absolute"
        this.hoverElement.style.display = "none"
    }

    render() {
        this.label = `${this._date.getMonth() + 1}/${this._date.getDate()}`
        this.element.innerHTML = this.label + "<br>"
        this.hoverElement.innerHTML = ""

        if (this._selectedTask != null) {
            var displayedTasks = this._selectedTask.subtasks.filter(
                task => {
                    return task != null && isSameDay(this.date, task.due) && !task.deleted
                }
            )

            if (isSameDay(this._date, this._selectedTask.due)) displayedTasks.push(this._selectedTask)

            displayedTasks.forEach(child => {
                this.hoverElement.appendChild(child.getPlannerElement())
            })
        }

        this.refresh()
        this.element.appendChild(this.hoverElement)
    }

    private getFullCalTasks(): Task[] {
        if (!this.taskPlan.fullCal) return []
        var exclude = this.selectedTask != null ? [this.selectedTask, ...this.selectedTask!.subtasks]: []
        var tasks = this.taskMgr.getTasks().filter(t => {
            return isSameDay(t.due, this.date) && !exclude.includes(t)
        })
        return tasks
    }

    refresh() {
        if (this.hoverElement.style.display != "none") {
            return
        }
        if (this.hoverElement.children.length > 0 || this.getFullCalTasks().length > 0) {
            this.element.className = "tpdate"
            this.element.innerHTML = this.label! + "<br>"
            this.addCheckboxes()
        if (this.hoverElement.children.length > 0) {
            this.element.className = "tpdate hastask"
        }
        
        } else {
            this.element.className = "tpdate"
            this.element.innerHTML = this.label!
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