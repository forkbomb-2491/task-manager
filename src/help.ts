import { Task, onTaskEvent } from "./task";
import { TaskManager } from "./taskmanager";
import { onSettingChange } from "./settings";
import { onWindowFocused } from "./utils";

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
                (t: Task) => {
                    return t.size >= 2 && t.importance >= 2 && t.dueIn > 3*(t.size)
                },
            ),
            // Filterview
            // new HelpPane(
            //     this.taskMgr,
            //     document.getElementById("filterview")!,
            //     t => {
            //         return t.size + t.importance - t.dueIn
            //     },
            //     (t: Task) => {
            //         return t.size >= 2 && t.importance >= 2 && t.dueIn > 3*(t.size)
            //     },
            // ),
            
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
    private taskMgr: TaskManager
    private element: HTMLElement

    private theAlgorithm: (t: Task) => number
    private taskFilter: (t: Task) => boolean
    private _recListLength: number
    private _overdue: boolean = true

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

    private getTasks() {
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