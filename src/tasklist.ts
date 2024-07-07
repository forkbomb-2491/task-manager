import { SortBasis, onWindowFocused } from "./utils";
import { onTaskEvent, onTaskAdd, Task } from "./task";
import { TaskManager } from "./taskmanager";

/**
 * A Task View that represents and handles the Tasks tab.
 */
export class TaskList {
    private taskMgr: TaskManager;

    private sortBasis: SortBasis = SortBasis.duedate;
    private sortReverse: boolean = false;

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr;

        document.getElementById("completedtasksbutton")!.addEventListener(
            "click",
            (_) => { this.toggleCompletedVisibility(); }
        );

        onTaskEvent(_ => this.refresh());
        onTaskAdd(e => this.addTask(this.taskMgr.getTask(e.task.id)!));
        onWindowFocused(() => this.refresh());
    }

    private sort(container: Element = document.getElementById("currenttasklist")!) {
        if (container.children.length < 2) {
            return;
        }
        var sortClosure = (a: Element, b: Element) => {
            var ret: number = 0;
            const taskA = this.taskMgr.getTask(a.getAttribute("name")!)!;
            const taskB = this.taskMgr.getTask(b.getAttribute("name")!)!;
            switch (this.sortBasis) {
                case SortBasis.name:
                    ret = taskA.name > taskB.name ? 1 : -1;
                    break;
                case SortBasis.category:
                    ret = taskA.category > taskB.category ? 1 : -1;
                    break;
                case SortBasis.size:
                    ret = taskA.size - taskB.size;
                    break;
                case SortBasis.importance:
                    ret = taskA.importance - taskB.importance;
                    break;
                case SortBasis.duedate:
                    ret = taskA.due.valueOf() - taskB.due.valueOf();
                    break;
                default:
                    break;
            }
            if (this.sortReverse) { ret *= -1; }
            return ret;
        };
        var elements = [...container.children].sort(sortClosure);
        container.innerHTML = "";
        elements.forEach(element => {
            container.appendChild(element);
        });
    }

    /**
     * Loads tasks from the List's TaskManager and sorts them into the
     * completed and current task lists.
     */
    render() {
        var currentList = document.getElementById("currenttasklist")!;
        var completedList = document.getElementById("completedtasklist")!;

        // Wipe current contents
        currentList.innerHTML = "";
        completedList.innerHTML = "";

        var tasks = this.taskMgr.tasks;
        for (let index = 0; index < tasks.length; index++) {
            const task = tasks[index];
            if (task.deleted) { continue; }
            if (task.completed) {
                completedList.appendChild(task.taskListElement);
            } else {
                currentList.appendChild(task.taskListElement);
            }
        }

        this.sort();
    }

    /**
     * Checks to see that all completed and current tasks are sorted into
     * the correct lists on the Tasks tab.
     */
    refresh() {
        var currentList = document.getElementById("currenttasklist")!;
        var completedList = document.getElementById("completedtasklist")!;
        for (let i = 0; i < currentList.children.length; i++) {
            const task = currentList.children[i];
            if (task.children[0].className.includes("completed")) {
                currentList.removeChild(task);
                completedList.appendChild(task);
            }
        }

        for (let i = 0; i < completedList.children.length; i++) {
            const task = completedList.children[i];
            if (!task.children[0].className.includes("completed")) {
                completedList.removeChild(task);
                currentList.appendChild(task);
            }
        }

        this.sort();
    }

    addTask(task: Task) {
        if (task.parent == null) {
            document.getElementById("currenttasklist")!.appendChild(task.taskListElement);
        }
        this.sort();
    }

    private toggleCompletedVisibility() {
        var list = document.getElementById("completedtasklist")!;
        if (list.style.display == "none") {
            list.style.display = "block";
        } else {
            list.style.display = "none";
        }
    }
}
