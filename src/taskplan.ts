import { TaskManager } from "./main";
import { Task, TaskView } from "./task";
import { WEEKDAY_STRINGS } from "./utils";


export class TaskPlanner implements TaskView {
    private calStartDate: Date = new Date()

    filter: (t: Task) => boolean = _ => true

    // @ts-ignore
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

    addTask(_: Task): void {
        this.refresh()
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