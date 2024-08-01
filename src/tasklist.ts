import { SortBasis, onWindowFocused, registerShowHideButton, showSheet, showTooltipOnHover, toHTMLDateTimeString } from "./utils";
import { onTaskEvent, onTaskAdd, Task, List, TaskColor } from "./task";
import { TaskManager } from "./taskmanager";
import { ask } from "@tauri-apps/plugin-dialog";
import { smartDueDate } from "./algorithm";

/**
 * A Task View that represents and handles the Tasks tab.
 */
export class TaskList {
    private taskMgr: TaskManager;
    private selectedList: List | null = null
    private editingList: boolean = false;

    private _sortBasis: SortBasis = SortBasis.duedate;
    private get sortBasis(): SortBasis { return this._sortBasis }
    private set sortBasis(basis: SortBasis) {
        if (this.sortBasis == basis) {
            this.sortReverse = !this.sortReverse
        } else {
            this.sortReverse = false
        }
        this._sortBasis = basis;
        this.sort();
        this.taskMgr.getTasks().forEach(
            t => t.sortBasis = this.sortBasis
        )

        document.getElementById("alphasort")!.innerHTML = `${this.sortBasis == SortBasis.name ? (this.sortReverse ? "↑": "↓") + " ":""}Name`
        document.getElementById("sizesort")!.innerHTML = `${this.sortBasis == SortBasis.size ? (this.sortReverse ? "↑": "↓") + " ":""}Size`
        document.getElementById("importancesort")!.innerHTML = `${this.sortBasis == SortBasis.importance ? (this.sortReverse ? "↑": "↓") + " ":""}Importance`
        document.getElementById("duedatesort")!.innerHTML = `${this.sortBasis == SortBasis.duedate ? (this.sortReverse ? "↑": "↓") + " ":""}Due Date`
    }

    private sortReverse: boolean = false;

    constructor(taskMgr: TaskManager) {
        this.taskMgr = taskMgr;

        registerShowHideButton("completedtasksbutton", "completedtasklist")

        document.getElementById("alphasort")!.addEventListener(
            "click",
            (_) => this.sortBasis = SortBasis.name
        )

        document.getElementById("sizesort")!.addEventListener(
            "click",
            (_) => this.sortBasis = SortBasis.size
        )

        document.getElementById("importancesort")!.addEventListener(
            "click",
            (_) => this.sortBasis = SortBasis.importance
        )

        document.getElementById("duedatesort")!.addEventListener(
            "click",
            (_) => this.sortBasis = SortBasis.duedate
        )

        document.getElementById("showalltasksbutton")!.addEventListener(
            "click",
            _ => {
                if (this.editingList) { return }
                this.selectedList = null
                this.render()
            }
        )

        document.getElementById("taskcreateform")!.addEventListener(
            "submit",
            (e) => { this.createTaskCallback(e) }
        )

        document.getElementById("listcreate")!.addEventListener(
            "submit",
            (e) => { this.createListCallback(e) }
        )

        document.getElementById("listdeletebutton")!.addEventListener(
            "click",
            async _ => {
                if (this.selectedList!.tasks.filter(t => !t.deleted).length > 0) {
                    if (!await ask("This list is not empty. Are you sure you want to PERMANENTLY delete it?")) {
                        return
                    }
                }
                this.taskMgr.deleteList(this.selectedList!)
                this.selectedList = null
                this.render()
            }
        )

        document.getElementById("listnamechange")!.addEventListener(
            "click",
            e => {
                // @ts-ignore
                const button: HTMLButtonElement = e.currentTarget
                const title = document.getElementById("selectedlisttitle")!;
                if (!this.editingList) {
                    this.editingList = true
                    button.style.display = "initial"
                    button.innerText = "✅"
                    
                    var input = document.createElement("input")
                    title.replaceWith(
                        input
                    )
                    input.value = this.selectedList!.name.replaceAll('"', "&#34;")
                    input.id = "selectedlisttitle"
                } else {
                    this.editingList = false
                    // @ts-ignore
                    if (title.value.length == 0) return
                    button.style.display = ""
                    button.innerText = "✏️"
                    // @ts-ignore
                    this.selectedList!.name = title.value
                    title.contentEditable = "false"

                    var h2 = document.createElement("h2")
                    title.replaceWith(
                        h2
                    )
                    h2.id = "selectedlisttitle"
                    this.render()
                }
            }
        )

        showTooltipOnHover(
            document.getElementById("smartduedateinfo")!,
            "Check this box to have your task's due dates adjusted according to what Task-Manager's learned about you."
        )
        document.getElementById("smartduedateinfo")!.addEventListener(
            "click",
            _ => {
                showSheet("Automatic Due Date Adjustment (\"The Algorithm\")", `
                    Task Manager learns how long it takes you to get things done based on tasks' list,
                    size, and importance values. When you create a task, the app records the initial due
                    date you set. It then records the completion date when you finish it. Using that
                    information, Task Manager estimates how much you <i>mis</i>estimate how long it takes to 
                    get things done, and moves the due date to compensate. If you tend to overrun due dates,
                    for example, Task Manager will automatically move the task's due date up a few days to 
                    try to help you get it done on time.
                    `)
            }
        )

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
                    ret = taskA.color > taskB.color ? 1 : -1;
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

    private createTaskCallback(event: SubmitEvent) {
        event.preventDefault()
        
        // @ts-ignore; Necessary to make this whole darn thing work
        var form: HTMLFormElement = event.target
        var title = form.titleinput.value
        var date = new Date(form.deadlineinput.valueAsNumber + (new Date().getTimezoneOffset() * 60_000))
        var size = form.sizeinput.selectedOptions.item(0).getAttribute("name")
        var importance = form.importanceinput.selectedOptions.item(0).getAttribute("name")

        var box = document.getElementById("taskcreatebox")!
        box.style.scale = "1.03"
        window.setTimeout(() => box.style.scale = "1.0", 100)
        form.reset()
        form.deadlineinput.value = toHTMLDateTimeString(new Date())
        
        var task = new Task(title, size, importance, date, false)
        task.color = TaskColor[this.selectedList!.color]
        smartDueDate(task, this.selectedList!).then(_ => this.taskMgr.addTask(task, this.selectedList!.name))
    }

    private createListCallback(event: SubmitEvent) {
        event.preventDefault()
        
        // @ts-ignore; Necessary to make this whole darn thing work
        var form: HTMLFormElement = event.target
        var title = form.listtitleinput.value
        var color = Number(form.catinput.selectedOptions.item(0).getAttribute("name"))

        form.reset()
        this.taskMgr.newList(title, color)
        this.render()
    }

    /**
     * Loads tasks from the List's TaskManager and sorts them into the
     * completed and current task lists.
     */
    render() {
        var previews = document.getElementById("tasklistpreviews")!
        previews.innerHTML = ""
        this.taskMgr.lists.sort((a, b) => a.name > b.name ? 1 : -1).forEach(list => {
            if (this.selectedList != null && list.uuid == this.selectedList.uuid) return

            var newElement = document.createElement("div")
            newElement.className = "container"
            newElement.innerHTML = `
            <h2>${list.name}</h2>
            <br>
            `
            newElement.style.cursor = "pointer"

            newElement.addEventListener(
                "click",
                _ => {
                    if (this.editingList) { return }
                    this.selectedList = list
                    this.render()
                }
            )

            for (let i = 0; i < list.tasks.filter(t => !t.deleted && !t.completed).length; i++) {
                const task = list.tasks.filter(t => !t.deleted && !t.completed)[i];
                if (i == 2) break
                newElement.appendChild(task.miniTaskListElement)
            }

            previews.appendChild(newElement)
        })

        var currentList = document.getElementById("currenttasklist")!;
        var completedList = document.getElementById("completedtasklist")!;
        
        // Wipe current contents
        currentList.innerHTML = "";
        completedList.innerHTML = "";

        if (this.selectedList == null) {
            document.getElementById("selectedlisttitle")!.innerText = "All Tasks"
            document.getElementById("taskcreatesection")!.style.display = "none"

            document.getElementById("listdeletebutton")!.style.display = "none"
            document.getElementById("listnamechange")!.style.display = "none"
        } else {
            document.getElementById("selectedlisttitle")!.innerText = this.selectedList!.name
            document.getElementById("taskcreatesection")!.style.display = "initial"

            document.getElementById("listdeletebutton")!.style.display = "initial"
            document.getElementById("listnamechange")!.style.display = ""
        }

        var tasks = this.selectedList != null ? this.selectedList.tasks : this.taskMgr.tasks;
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
}
