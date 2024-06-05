import { StorageManager, getTasksChanged, loadTasks, loadTabs } from './storage'
import { Task, TaskList } from './task'
import { Planner, switchPlannerOrientation } from './planner'
import { HelpManager, changeHelpStuff } from './help'
import { CheckInHandler } from './notifications'
import { TimerHandler } from "./pomodoro";

var app: App

await loadTabs()

class App {
    private taskMgr: TaskManager
    private checkInHandler: CheckInHandler | undefined
    private storageMgr: StorageManager

    private pomodoro: TimerHandler | null = null

    constructor() {
        this.taskMgr = new TaskManager()
        this.storageMgr = new StorageManager()
    }
    
    async main() {
        this.loadCheckInHandler().then()
        this.taskMgr.start().then()

        // Register callbacks
        document.getElementById("taskcreateform")!.addEventListener(
            "submit",
            (e) => { this.createTaskCallback(e) }
        )
        document.getElementById("remindersettings")!.addEventListener(
            "submit",
            (e) => { this.changeNotifSettingsCallback(e) }
        )
        document.getElementById("switchplanner")!.addEventListener(
            "click",
            (_) => { this.switchPlannerCallback() }
        )

        this.addThemeButtonCallbacks()
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
            }
        )

        // @ts-ignore; Populate fields' default values
        document.getElementById("deadlineinput")!.valueAsDate = new Date()
        // @ts-ignore
        document.getElementById("tpdeadlineinput")!.valueAsDate = new Date()

        // Apply settings
        this.storageMgr.getLastTheme().then((theme: string) => {
            this.changeTheme(theme)
        })

        this.storageMgr.getPlannerFlipped().then((flipped: boolean) => {
            if (flipped) { switchPlannerOrientation() }
        })

        this.storageMgr.getLastTab().then((tab: string) => {
            this.changeTab(tab)
        })

        this.setSettingsFieldsToSavedValues().then()

        document.body.style.display = "block"
    }

    private async loadCheckInHandler(): Promise<boolean> {
        var stgs = await this.storageMgr.getCheckInSettings()
        if (Object.values(stgs).includes(null)) {
            return false
        }
        
        this.checkInHandler = new CheckInHandler(
            // @ts-ignore; If it isn't null, it's the right type
            stgs.startTime,
            stgs.endTime,
            stgs.interval,
            stgs.daysEnabled
        )

        this.checkInHandler.start()

        // @ts-ignore
        window.cih = this.checkInHandler
        return true
    }

    private async setSettingsFieldsToSavedValues() {
        var reminderStgs = await this.storageMgr.getCheckInSettings()
        if (reminderStgs.startTime != null) {
            // @ts-ignore
            document.getElementById("notifstart")!.value = reminderStgs.startTime
        }
        if (reminderStgs.endTime != null) {
            // @ts-ignore
            document.getElementById("notifend")!.value = reminderStgs.endTime
        }

        if (reminderStgs.daysEnabled != null) {
            var daysEnabled = reminderStgs.daysEnabled
            // @ts-ignore
            document.getElementById("remindersun")!.checked = daysEnabled[0]
            // @ts-ignore
            document.getElementById("remindermon")!.checked = daysEnabled[1]
            // @ts-ignore
            document.getElementById("remindertue")!.checked = daysEnabled[2]
            // @ts-ignore
            document.getElementById("reminderwed")!.checked = daysEnabled[3]
            // @ts-ignore
            document.getElementById("reminderthu")!.checked = daysEnabled[4]
            // @ts-ignore
            document.getElementById("reminderfri")!.checked = daysEnabled[5]
            // @ts-ignore
            document.getElementById("remindersat")!.checked = daysEnabled[6]
            // @ts-ignore
        }

        if (reminderStgs.interval != null) {
            // @ts-ignore
            document.getElementById("notifintervalslider")!.value = reminderStgs.interval / 60_000
            // @ts-ignore
            document.getElementById("notifinterval")!.innerHTML = reminderStgs.interval / 60_000
        }

        this.storageMgr.getLastTheme().then(theme => {
            var selector = document.getElementById("themeselector")
            for (let i = 0; i < selector!.getElementsByTagName("input").length; i++) {
                const element = selector!.getElementsByTagName("input")[i];
                if (element.value == theme) {
                    element.checked = true
                    break
                }
            }
        })
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
    
        var task = new Task(title, size, importance, cat, date, false)
        this.taskMgr.addTask(task)
    }

    private changeNotifSettingsCallback(event: SubmitEvent) {
        event.preventDefault()

        // @ts-ignore
        var form: HTMLFormElement = event.target
        var startTime = form.notifstart.value
        var endTime = form.notifend.value
        var sliderValue = form.notifintervalslider.value

        var daysEnabled = [
            form.remindersun.checked,
            form.remindermon.checked,
            form.remindertue.checked,
            form.reminderwed.checked,
            form.reminderthu.checked,
            form.reminderfri.checked,
            form.remindersat.checked,
        ]
    
        if (this.checkInHandler != null) {
            this.checkInHandler.setStartTime(startTime)
            this.checkInHandler.setEndTime(endTime)
            this.checkInHandler.setInterval(Number(sliderValue) * 60_000)
            this.checkInHandler.start()
        } else {
            this.checkInHandler = new CheckInHandler(startTime, endTime, Number(sliderValue) * 60_000, daysEnabled)
            this.checkInHandler.start()
        }

        this.storageMgr.setCheckInSettings(startTime, endTime, sliderValue, daysEnabled).then()
    }

    private switchPlannerCallback() {
        this.storageMgr.setPlannerFlipped(switchPlannerOrientation()).then(async () => {
            await this.storageMgr.saveSettings()
        })
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

    private changeTheme(theme: string) {
        var themes = document.head.getElementsByClassName("theme")
        for (let i = 0; i < themes.length; i++) {
            const themeSheet = themes[i];
            if (themeSheet.getAttribute("name") != theme && !themeSheet.hasAttribute("disabled")) {
                themeSheet.setAttribute("disabled", "")
            } else if (themeSheet.getAttribute("name") == theme) {
                themeSheet.removeAttribute("disabled")
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

    /** Assign as click callback to theme buttons. */
    async themeButtonCallback(event: Event) {
        var theme: string = ""

        // @ts-ignore
        var elements = event.currentTarget!.getElementsByTagName("input")!
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.checked) {
                theme = element.value
                break
            }
        }

        this.changeTheme(theme)
        this.storageMgr.setLastTheme(theme).then(
            async () => {
                await this.storageMgr.saveSettings()
            }
        )
    }

    /** Assign as click callback to tab change buttons. */
    private tabChangeCallback(event: Event) {
        // @ts-ignore
        var button: HTMLButtonElement = event.currentTarget
        var tab = button.name
        this.changeTab(tab)
        this.storageMgr.setLastTab(tab).then(
            async () => {
                await this.storageMgr.saveSettings()
            }
        )
    }

    private addThemeButtonCallbacks() {
        var themeButtonCallback = (e: Event) => {
            this.themeButtonCallback(e)
        }

        document.getElementById("themeselector")!.addEventListener("change", themeButtonCallback);
        
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
    private tasks: Task[] = []

    private taskList: TaskList
    private planner: Planner
    private helpMgr: HelpManager

    constructor() {
        this.taskList = new TaskList(this)
        this.planner = new Planner(this)
        this.helpMgr = new HelpManager(this)

        window.addEventListener(
            "taskchanged",
            () => { this.refresh() }
        )
    }

    async start() {
        await this.loadTasks()
        this.render()
    }

    private async loadTasks() {
        this.tasks = await loadTasks()
        for (let index = 0; index < this.tasks.length; index++) {
            const task = this.tasks[index];
            task.completeCallback = () => { this.refresh() }
            task.deleteCallback = () => { this.refresh() }
        }

        this.render()
    }

    private saveTasksViaEvent() {
        window.dispatchEvent(getTasksChanged(this.tasks))
    }

    private render() {
        this.taskList.render()
        this.planner.render()
        this.helpMgr.render()
    }

    private refresh() {
        this.taskList.refresh()
        this.planner.refresh()
        this.helpMgr.render()

        this.saveTasksViaEvent()
    }

    getTasks() {
        return [...this.tasks]
    }

    addTask(task: Task) {
        this.tasks.push(task)

        this.planner.addTask(task)
        this.taskList.addTask(task)
        this.helpMgr.refresh()

        this.saveTasksViaEvent()
    }
}

app = new App()
await app.main()