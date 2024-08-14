import { Task, onTaskEvent } from "./task";
import { TaskManager } from "./taskmanager";

export class EisenManager {
    private taskMgr: TaskManager
    private panes: EisenPane[]
    private _overdue: boolean

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
        // @ts-ignore
        this._overdue = !document.getElementById("helptoggleoverdue")!.checked
        this.panes = [
            new EisenPane(this.taskMgr,
                document.getElementById("eisenhowerbd")!,
                t => {
                    return t.size + t.importance - t.dueIn
                },
                t => {
                    return t.size >= 2 && t.importance >= 2 && t.dueIn > 3*(t.size)
                }
            ),
            new EisenPane(this.taskMgr,
                document.getElementById("eisenhowerbs")!,
                t => {
                    return t.size/2 + t.importance/2 - t.dueIn
                },
                t => {
                    return t.size >= 2 && t.importance >= 2 && t.dueIn < 3*(t.size)
                }
            ),
            new EisenPane(this.taskMgr,
                document.getElementById("eisenhowersd")!,
                t => {
                    return t.size + t.importance - t.dueIn
                },
                t => {
                    return t.size <= 2 && t.importance <= 2 && t.dueIn > 3*(t.size)
                },
            ),
            new EisenPane(this.taskMgr,
                document.getElementById("eisenhowerss")!,
                t => {
                    return t.size/2 + t.importance/2 - t.dueIn
                },
                t => {
                    return t.size <= 2 && t.importance <= 2 && t.dueIn < 3*(t.size)
                }
                
            ),
        ]

        // onWindowFocused(() => this.render())
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

class EisenPane {
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
        // onSettingChange("recListLength", e => this.recListLength = e.value)
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
            this.element.appendChild(task.plannerElement)
        });
    }
}