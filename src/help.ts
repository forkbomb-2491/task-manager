import { Task, TaskView } from "./task";
import { TaskManager } from "./main";

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

export class HelpManager implements TaskView {
    private taskMgr: TaskManager

    private panes: HelpPane[]

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
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
        ]
    }

    render(): void {
        this.panes.forEach(pane => {
            pane.render()
        });
    }

    refresh(): void {
        this.render()
    }
    
    addTask(_: Task): void {
        this.render()
    }
}

class HelpPane {
    private taskMgr: TaskManager
    private element: HTMLElement

    private theAlgorithm: (t: Task) => number
    private taskFilter: (t: Task) => boolean
    private _recListLength: number

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

        window.addEventListener(
            "taskchanged",
            () => {
                this.render()
            }
        )

        window.addEventListener(
            "reclistchange",
            e => {
                // @ts-ignore
                this.recListLength = e.value
            }
        )
    }

    private getTasks() {
        var tasks = this.taskMgr.getTasks().filter((t) => {
            return !t.completed && !t.deleted && this.taskFilter(t)
        })
        tasks = tasks.sort((t1, t2) => {
            return this.theAlgorithm(t2) - this.theAlgorithm(t1)
        })
        // return tasks.slice(0, nTasks)
        return tasks.slice(0, this._recListLength)

    }

    render(): void {
        this.element.innerHTML = ""
        var tasks = this.getTasks()
        tasks.forEach(task => {
            this.element.appendChild(task.shortenedTaskListElement)
        });
    }
}