import { loadTasks, loadTabs, saveTasks } from './storage'
import { Task, TaskList } from './task'
import { Planner, switchPlannerOrientation } from './planner'
import { HelpManager, changeHelpStuff } from './help'
import { TimerHandler } from "./pomodoro";
import { TaskPlanner } from './taskplan'
import { Settings, SettingsView, onSettingsLoad } from './settings'
import { TaskNotifier } from './notifications'
// @ts-ignore
import { addDebugFuncs } from './debug'
import { ProgressBarStatus, getCurrent } from '@tauri-apps/api/window';

const DEBUG_TAB = true
if (DEBUG_TAB) {
    addDebugFuncs()
    document.getElementById("debugtabbutton")!.style.display = "block"
}

var app: App

await loadTabs()

class App {
    // Frontend
        // Nothing here!

    // Backend
    private taskMgr: TaskManager
    private settings: Settings

    // Other
    private pomodoro: TimerHandler | null = null

    constructor() {
        this.taskMgr = new TaskManager()
        this.settings = new Settings()
        new SettingsView(this.settings)
    }
    
    async main() {
        this.taskMgr.start().then()

        // Register callbacks
        document.getElementById("taskcreateform")!.addEventListener(
            "submit",
            (e) => { this.createTaskCallback(e) }
        )
        
        document.getElementById("switchplanner")!.addEventListener(
            "click",
            (_) => { this.switchPlannerCallback() }
        )

        this.addTabButtonCallbacks()
        this.addHelpButtonCallbacks()

        document.getElementById("pomostart")!.addEventListener(
            "click",
            _ => this.pomoStart()
        )

        document.getElementById("pomopause")!.addEventListener(
            "click",
            _ => this.pomoStop(true)
        )

        document.getElementById("pomostop")!.addEventListener(
            "click",
            _ => {
                this.pomoStop()
                this.pomodoro = null
                document.getElementById("pomodorotimer")!.innerHTML = "00:00"
                document.getElementById("pomodorostatus")!.innerHTML = "Cancelled"
                getCurrent().setProgressBar({
                    status: ProgressBarStatus.None
                }).then()
            }
        )

        // @ts-ignore; Populate fields' default values
        document.getElementById("deadlineinput")!.valueAsDate = new Date()

        onSettingsLoad(() => {
            this.changeTab(this.settings.lastTab)
        })

        this.settings.load()

        document.body.style.display = "block"

        // DEBUG
        if (DEBUG_TAB) {
            // @ts-ignore
            window.taskMgr = this.taskMgr
        }
    }

    private createTaskCallback(event: SubmitEvent) {
        event.preventDefault()

        // @ts-ignore; Necessary to make this whole darn thing work
        var form: HTMLFormElement = event.target
        var title = form.titleinput.value
        var cat = form.catinput.value
        var date = form.deadlineinput.valueAsDate
        var size = form.sizeinput.selectedOptions.item(0).getAttribute("name")
        var importance = form.importanceinput.selectedOptions.item(0).getAttribute("name")
    
        var task = new Task(this.taskMgr, title, size, importance, cat, date, false)
        this.taskMgr.addTask(task)
    }

    private switchPlannerCallback() {
        this.settings.plannerFlipped = !this.settings.plannerFlipped
        this.settings.plannerFlipped = switchPlannerOrientation()
    }

    /**
     * Switches displayed tab to the target.
     * @param {string} tab Tab Name
     */
    private changeTab(tab: string) {
        var buttons = document.getElementsByClassName("tabbutton")
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            if (button.getAttribute("name") == tab) {
                button.className = "tabbutton active"
            } else if (button.className == "tabbutton active") {
                button.className = "tabbutton"
            }
        }
    
        var tabs = document.getElementsByClassName("tab")
        for (let i = 0; i < tabs.length; i++) {
            const tabElement = tabs[i];
            if (tabElement.getAttribute("name") == tab) {
                tabElement.className = "tab visible"
            } else if (tabElement.className == "tab visible") {
                tabElement.className = "tab"
            }
        }
    }

    private pomoStart() {
        if (this.pomodoro != null && !this.pomodoro.complete) {
            this.pomodoro.start()
        } else {
            // @ts-ignore 2339
            var workTime = Number(document.getElementById("workduratslider")!.value)
            // @ts-ignore 2339
            var breakTime = Number(document.getElementById("breakduratslider")!.value)
            // @ts-ignore 2339
            var repeatTimes = Number(document.getElementById("repeatslider")!.value)

            this.pomodoro = new TimerHandler(repeatTimes, workTime, breakTime, () => {this.pomodoro = null})
            this.pomodoro.start()
        }
    }

    private pomoStop(pausing: boolean = false) {
        if (this.pomodoro == null || this.pomodoro.complete) { return }
        this.pomodoro.stop()
        if (pausing) {
            document.getElementById("pomodorotimer")!.innerHTML += " ⏸️"
        }
    }

    /** Assign as click callback to tab change buttons. */
    private tabChangeCallback(event: Event) {
        // @ts-ignore
        var button: HTMLButtonElement = event.currentTarget
        var tab = button.name
        this.changeTab(tab)
        this.settings.lastTab = tab
    }

    private addTabButtonCallbacks() {
        var tabChangeCallback = (e: Event) => {
            this.tabChangeCallback(e)
        }

        var tabButtons = document.getElementsByClassName("tabbutton");
        for (let i = 0; i < tabButtons.length; i++) {
            const button = tabButtons[i];
            button.addEventListener("click", tabChangeCallback);
        }
    }

    private addHelpButtonCallbacks() {
        var helpButtons = document.getElementsByClassName("helpbutton")
        for (let i = 0; i < helpButtons.length; i++) {
            const button = helpButtons[i];
            button.addEventListener(
                "click",
                (e) => {
                    // @ts-ignore
                    changeHelpStuff(e.currentTarget!.getAttribute("name"))
                }
            )
        }
    }
}

/**
 * The Task Manager.
 */
export class TaskManager {
    private _tasks: Task[] = []

    get tasks(): Task[] {
        return [...this._tasks]
    }

    private taskList: TaskList
    private planner: Planner
    private helpMgr: HelpManager
    private taskPlanner: TaskPlanner
    private taskNotifier: TaskNotifier

    private settingsLoaded: boolean = false

    constructor() {
        this.taskList = new TaskList(this)
        this.planner = new Planner(this)
        this.helpMgr = new HelpManager(this)
        this.taskPlanner = new TaskPlanner(this)
        this.taskNotifier = new TaskNotifier(this)

        window.addEventListener(
            "taskchanged",
            _ => this.refresh()
        )

        window.addEventListener(
            "focus",
            _ => this.refresh()
        )

        window.addEventListener(
            "taskchanged", 
            _ => {
                saveTasks(this._tasks).then()
            }
        )
        
        onSettingsLoad(() => this.settingsLoaded = true)
    }

    async start() {
        await this.loadTasks()
        this.render()
    }

    private async loadTasks() {
        this._tasks = (await loadTasks()).map(
            o => new Task(
                this,
                o.name,
                o.size,
                o.importance,
                o.category,
                o.due,
                o.completed,
                o.id,
                o.subtasks,
                null
            )
        )

        this.render()
    }

    private render() {
        this.taskList.render()
        this.planner.render()
        this.helpMgr.render()
        this.taskPlanner.render()

        if (this.settingsLoaded) {
            this.taskNotifier.refresh()
        } else {
            onSettingsLoad(() => this.taskNotifier.refresh())
        }

    }

    refresh() {
        this.taskList.refresh()
        this.planner.refresh()
        this.helpMgr.render()
        this.taskPlanner.refresh()
        // this.taskNotifier.refresh()

        saveTasks(this._tasks).then()
    }

    private flattenTaskList(currentList: Task[]): Task[] {
        var ret: Task[] = []
        for (let i = 0; i < currentList.length; i++) {
            const currentTask = currentList[i];
            ret.push(currentTask)
            if (currentTask.subtasks.length > 0) {
                ret = ret.concat(this.flattenTaskList(currentTask.subtasks))
            }
        }
        return ret
    }

    getTasks() {
        return this.flattenTaskList(this._tasks)
    }

    getTask(id: string): Task | null {
        for (let i = 0; i < this.getTasks().length; i++) {
            const task = this.getTasks()[i];
            if (task.id == id) {
                return task
            }
        }

        return null
    }

    addTask(task: Task) {
        if (task.parent == null) {
            this._tasks.push(task)
        }

        this.planner.addTask(task)
        this.taskList.addTask(task)
        this.taskPlanner.addTask(task)
        this.helpMgr.refresh()
        // this.taskNotifier.refresh()

        saveTasks(this._tasks).then()
    }
}

app = new App()
await app.main()