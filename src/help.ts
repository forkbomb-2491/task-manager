import { Task, onListEvent, onTaskEvent } from "./task";
import { TaskManager } from "./taskmanager";
import { onSettingChange } from "./settings";
import { getElement, getFirstSelected, onWindowFocused } from "./utils";

export function changeHelpStuff(target: string) {
    // Change tab to target in all contexts
    var tabs = document.getElementsByClassName("helpcontent")
    for (let i = 0; i < tabs.length; i++) {
        const tabElement = tabs[i];
        if (tabElement.getAttribute("name") == target) {
            tabElement.className = "helpcontent visible"
        } else if (tabElement.className == "helpcontent visible") {
            tabElement.className = "helpcontent"
        }
    }
}

export class HelpManager {
    private taskMgr: TaskManager
    private panes: HelpPane[]
    private _overdue: boolean

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
        // @ts-ignore
        this._overdue = !document.getElementById("helptoggleoverdue")!.checked
        this.panes = [
            new HelpPane(
                this.taskMgr,
                document.getElementById("overwhelmedtasks")!,
                (task: Task) => {
                    var importance = 0
                    importance += (4 - task.size) * 4
                    importance += (task.dueIn <= 7) ? ((7 - task.dueIn) * 2) : (0)
                    importance += task.importance
                    return importance
                },
                (task: Task) => {
                    return (task.size < 3)
                },
            ),
            new HelpPane(
                this.taskMgr,
                document.getElementById("cantstarttasks")!,
                (task: Task) => {
                    var importance = 0
                    importance += (4 - task.size) * 4
                    importance += (task.dueIn <= 7) ? ((7 - task.dueIn) * 2) : (0)
                    importance += 4 - task.importance
                    return importance
                },
                (task: Task) => {
                    return (task.size < 3)
                },
            ),
            new HelpPane(
                this.taskMgr,
                document.getElementById("sidetrackedtasks")!,
                (task: Task) => {
                    var importance = 0
                    importance += (task.dueIn <= 7) ? ((7 - task.dueIn) * 3) : (0)
                    importance += (task.importance) * 4
                    importance += task.size * 3
                    return importance
                },
                (_: Task) => {
                    return true
                },
            ),
            new HelpPane(
                this.taskMgr,
                document.getElementById("bigupcomingview")!,
                t => {
                    return t.size/2 + t.importance - t.dueIn
                },
                (t: Task) => {
                    return t.size >= 2 && t.importance >= 2 
                },
            ),
            new HelpPane(
                this.taskMgr,
                document.getElementById("smallupcomingview")!,
                t => {
                    return t.size + t.importance - t.dueIn
                },
                (t: Task) => {
                    return t.size <= 2 && t.importance >= 2 
                },
            ),
            new HelpPane(
                this.taskMgr,
                document.getElementById("bigdistantview")!,
                t => {
                    return t.size + t.importance - t.dueIn
                },
                t => {
                    return t.size >= 2 && t.importance >= 2 && t.dueIn > 3*(t.size)
                },
            ),
            // Filterview
            new FilterPane(
                this.taskMgr,
                document.getElementById("filterview")!
            ),
        ]
        onWindowFocused(() => this.render())
        // Listener for checkbox
        document.getElementById("helptoggleoverdue")!.addEventListener(
            "change",
            _ => {
                // @ts-ignore
                this.overdue = !document.getElementById("helptoggleoverdue")!.checked
                console.log(this._overdue);
                this.render()
            }
        )
        // Listener for help filter
    }

    render(): void {
        this.panes.forEach(pane => {
            pane.overdue = this._overdue         
            pane.render()
        });
    }

    refresh(): void {
        this.render()
    }
    
    addTask(_: Task): void {
        this.render()
    }

    
    public get overdue() : boolean {
        return this._overdue
    }

    
    public set overdue(v : boolean) {
        this._overdue = v;
    }
    
    
}

class HelpPane {
    protected taskMgr: TaskManager
    protected element: HTMLElement

    protected theAlgorithm: (t: Task) => number
    protected taskFilter: (t: Task) => boolean
    protected _recListLength: number
    protected _overdue: boolean = true

    get recListLength(): number {
        return this._recListLength
    }

    set recListLength(value: number) {
        this._recListLength = value
        this.render()
    }

    constructor(
        taskMgr: TaskManager,
        element: HTMLElement,
        algo: ((t: Task) => number), 
        filter: ((t: Task) => boolean)
    ) {
        this.theAlgorithm = algo
        this.taskFilter = filter
        this.taskMgr = taskMgr
        this.element = element
        this._recListLength = 8

        onTaskEvent(_ => this.render(), true, true)
        onSettingChange("recListLength", e => this.recListLength = e.value)
    }

    protected getTasks() {
        var tasks = this.taskMgr.getTasks().filter((t) => {
            return !t.completed && !t.deleted && this.taskFilter(t)
        })
        tasks = tasks.sort((t1, t2) => {
            return this.theAlgorithm(t2) - this.theAlgorithm(t1)
        })
        // Filter Overdo Tasks Button
        if (this.overdue) {
        tasks = tasks.filter(
            t=> {
                return (t.dueIn > 0)
            }
        )
    }
        // return tasks.slice(0, nTasks)
        return tasks.slice(0, this._recListLength)

    }

    
    public get overdue() : boolean {
        return this._overdue
    }
    
    
    public set overdue(v : boolean) {
        this._overdue = v;
    }
    
    render(): void {
        this.element.innerHTML = ""
        var tasks = this.getTasks()
        tasks.forEach(task => {
            this.element.appendChild(task.shortenedTaskListElement)
        });
    }
}

class FilterPane extends HelpPane {
    firstRender: boolean = false;

    constructor(taskMgr: TaskManager, element: HTMLElement) {
        super(taskMgr, element, _ => 1, _ => true);
        this.taskFilter = this.applyFilters
        getElement("filterviewform").addEventListener(
            "change",
            _ => {
                this.render()
            }
        )

        onListEvent(_ => {
            this.firstRender = false
            this.render()
        })
    }

    override render() {
        if (!this.firstRender) { 
            this.listFilter() 
            this.firstRender = true
        }
        super.render()
    }

    private listFilter() {
        var listSelect = document.getElementById("listfilterview")!
        listSelect.innerHTML = ""
        var lists = this.taskMgr.lists
        
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i]
            var element = document.createElement("option")
            element.setAttribute("name", list.uuid)
            element.innerHTML = list.name
            
            listSelect.appendChild(element)
        }
        
        var nolist = document.createElement("option")
        nolist.setAttribute("name", "nolist")
        nolist.innerHTML = "No List"
        nolist.selected = true
        listSelect.appendChild(nolist)
    }

    private applyFilters(task: Task): boolean {
        return this.checkSizeFilter(task) &&
            this.checkDueDateFilter(task) &&
            this.checkListFilter(task) &&
            this.checkImportanceFilter(task)
    }

    private conditionHandler(conditionValue: string, filterValue: number, taskValue: number): boolean {
        switch (conditionValue) {
            case "0":
                return taskValue >= filterValue
            case "1":
                return taskValue == filterValue
            case "2":
                return taskValue <= filterValue
        
            default:
                return false;
        }
    }

    private checkListFilter(task: Task): boolean {
        // @ts-ignore
        var filterValue = getFirstSelected(getElement("listfilterview"))!.getAttribute("name")!
        if (filterValue == "nolist") {
            return true
        }
        // @ts-ignore
        return (task.list == filterValue)
    }
    
    private checkSizeFilter(task: Task): boolean {
        // @ts-ignore
        var filterValue = getFirstSelected(getElement("sizefilterview"))!.getAttribute("name")!
        if (filterValue == "default") {
            return true
        }
        // @ts-ignore
        var condition = getFirstSelected(getElement("sizefilterview2"))!.getAttribute("name")!
        return this.conditionHandler(condition, Number(filterValue), task.size);
    }

    private checkImportanceFilter(task: Task): boolean {
        // @ts-ignore
        var filterValue = getFirstSelected(getElement("importancefilterview"))!.getAttribute("name")!
        if (filterValue == "default") {
            return true
        }
        // @ts-ignore
        var condition = getFirstSelected(getElement("importancefilterview2"))!.getAttribute("name")!
        return this.conditionHandler(condition, Number(filterValue), task.size);
    }

    private checkDueDateFilter(task: Task): boolean {
        // @ts-ignore
        var filterValue = getElement("deadlinefilterview").valueAsDate
        if (filterValue == null) {
            return true
        }
        filterValue = new Date(filterValue.valueOf() + (new Date().getTimezoneOffset() * 60_000))
        // @ts-ignore
        var condition = getFirstSelected(getElement("deadlinefilterview2"))!.getAttribute("name")!
        switch (condition) {
            case "0":
                return task.due.valueOf() - filterValue.valueOf() < 86_400_000
            case "1":
                return Math.abs(task.due.valueOf() - filterValue.valueOf()) <= 86_400_000
            case "2":
                return task.due.valueOf() - filterValue.valueOf() > 86_400_000
        
            default:
                return false;
        }
    }
}