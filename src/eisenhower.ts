import { Task, onTaskEvent } from "./task";
import { TaskManager } from "./taskmanager";

export class EisenManager {
    private taskMgr: TaskManager
    private panes: EisenPane[]

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr
        this.panes = [
            new EisenPane(taskMgr,
                document.getElementById("eisenhowerbd")!,
                (task: Task) => {
                    return (task.size > 3, task.dueIn > 3)
                },
            )
        ]
    }
}

class EisenPane {
    private taskMgr: TaskManager
    private element: HTMLElement
    private recListLength: number

    constructor(
        taskMgr: TaskManager,
        element: HTMLElement,
        filter: ((t: Task) => boolean)
    ) {
        this.taskMgr = taskMgr
        this.element = element
        this.recListLength = 8


        // return tasks.slice(0, this._recListLength)
    }
    
    // render(): void {
    //     this.element.innerHTML = ""
    //     var tasks = this.getTasks()
    //     tasks.forEach(task => {
    //         this.element.appendChild(task.shortenedTaskListElement)
    //     });
    // }
}