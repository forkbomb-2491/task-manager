import { todayDateString } from "./utils";
import { Task } from "./task";
import { TaskManager } from "./taskmanager.ts";
import { RemindersContainer } from "./reminders.ts";
import { onSettingChange } from "./settings.ts";
import { sendNotif } from "./utils.ts";


export class CheckInHandler {
    private startTime: string
    private endTime: string

    private enabledInSettings: boolean = true

    private daysEnabled: boolean[] = [false, false, false, false, false, false, false]

    private interval: number // milliseconds

    // List of notifcontent
    private notifcontent: Object = {
        "Just checking in!": "Are you finding it hard to be productive? Open Task Manager for some help!",
        "You're doing great!": "Need any suggestions for what to do?  Open Task Manager for some help!",
        "Don't give up!": "Struggling to stay motivated? Open Task Manager for some help!",
        "Feeling stuck?":"Having trouble finding a sense of urgency? You have stuff coming up it would be good to get started on!"
    }

    private notifnum: number = 0

    private scheduledReminder: NodeJS.Timeout | null = null
    public get isRunning(): boolean {
        return this.scheduledReminder != null
    }

    public set isRunning(value: boolean) {
        if (value) {
            this.start()
        } else {
            this.stop()
        }
    }

    constructor(
        startTime: string, 
        endTime: string, 
        interval: number,
        daysEnabled: boolean[]
    ) {
        this.startTime = startTime
        this.endTime = endTime
        this.interval = interval
        if (daysEnabled.length == 7) {
            this.daysEnabled = daysEnabled
        }

        onSettingChange("checkinsEnabled", e => {this.enabledInSettings = e.value})
    }

    private getStartTimestamp() {
        var dateString = todayDateString() + " " + this.startTime // Local
        return Date.parse(dateString) // Local
    }

    private getEndTimestamp() {
        var dateString = todayDateString() + " " + this.endTime // Local
        return Date.parse(dateString) // Local
    }

    /**
     * return if the current time is between start and end
     * @returns boolean
     */
    private checkIsInTimeRange(interval: number) {
        var now = Date.now() // Local
        if (!this.daysEnabled[new Date().getDay()]) {
            console.log("hi")
            return false
        }
        if (now + interval > this.getStartTimestamp() && now + interval < this.getEndTimestamp()) {
            return true
        }
        return false
    }

    private scheduleReminder() {
        if (this.scheduledReminder != null) {
            return
        }
        var multiplier = Math.random()/2 + 0.75
        var interval = this.interval * multiplier
        if (!this.checkIsInTimeRange(interval)) {
            this.stop()
            return
        }
        this.scheduledReminder = setTimeout(() => { this.sendReminder() }, interval)
    }

    /**
     * Send check-in reminder
     */
    private sendReminder() {
        this.scheduledReminder = null
        this.notifnum = Math.floor(Math.random()*Object.keys(this.notifcontent).length)
        
        const notifTitle = Object.keys(this.notifcontent)[this.notifnum];
        if (this.enabledInSettings) {
            sendNotif(
                notifTitle,
                // @ts-ignore
                this.notifcontent[notifTitle]
            )
        }
        if (this.checkIsInTimeRange(this.interval)) {
            this.scheduleReminder()
        }
    }

    private restart() {
        if (this.isRunning || this.scheduledReminder) {
            this.stop()
            this.start()
        }
    }

    remindersActive() {
        return this.isRunning
    }

    setStartTime(time: string) {
        this.startTime = time
        this.restart()
    }

    setEndTime(time: string) {
        this.endTime = time
        this.restart()
    }

    setDaysEnabled(daysEnabled: boolean[]) {
        if (daysEnabled.length == 7) {
            this.daysEnabled = daysEnabled
            this.restart()
        }
    }
    
    setInterval(interval: number) {
        this.interval = interval
        this.restart()
    }

    start() {
        if (this.isRunning) {
            return
        }

        this.scheduleReminder()
    }

    stop() {
        if (!this.isRunning) {
            return
        }

        if (this.scheduledReminder != null) {
            window.clearTimeout(this.scheduledReminder)
        }
    }
}


export class TaskNotifier {
    private taskMgr: TaskManager
    private tasks: Task[]
    
    private overdue: Task[]
    private today: Task[]
    private nextup: Task[]

    private notifList: Task[]
    private remindersContainer: RemindersContainer

    private enabledInSettings: boolean = true

    private scheduledReminder: NodeJS.Timeout | null = null
    public get isRunning(): boolean {
        return this.scheduledReminder != null
    }

    constructor(taskMgr: TaskManager){
        this.taskMgr = taskMgr
        this.tasks = []
        this.notifList = []

        this.overdue = []
        this.today = []
        this.nextup = []

        this.remindersContainer = new RemindersContainer(this)
        this.remindersContainer.render()

        onSettingChange("remindersEnabled", e => {
            this.enabledInSettings = e.value
        })
    }

    /**
     * Gets tasks that have been notified to the user
     * Used for display in Reminders tab
     * @returns Task[]
     */
    getNotifTasks(){
        return [...this.notifList]
    }

    /**
     * If a specific task has not already been notified, send notification for this task
     */
    private sendTaskReminder(task: Task) {
        // var task = this.tasks[0]
        var thistitle: string
        var thisbody: string

        // If you haven't already gotten a notif about this task, send notif
        if (!this.notifList.includes(task) && this.enabledInSettings){

            if (task.dueIn < 0) {
            // overdue tasks reminder style
                thistitle = "Checking on " + task.name + "!",
                thisbody = "Have you made any progress on " + task.name + "? It was due " + ((task.dueIn*(-1))-1) + " day(s) ago!"
            } else if (task.dueIn == 0) {
            // today tasks reminder style
                thistitle = "Checking on " + task.name + "!",
                thisbody = "Have you made any progress on " + task.name + "? It's due today!"
            }
            else {
            // future tasks reminder style
                thistitle = "Checking on " + task.name + "!",
                thisbody = "Have you made any progress on " + task.name + "? You have " + task.dueIn + " day(s) until it's due!"
            }

            sendNotif(thistitle, thisbody)
            this.notifList.push(task)

            this.remindersContainer.render()
        }
        // schedule the next notification in list to be day before due date
        // this.scheduleReminder()
    }

    /**
     * Schedules all relevant tasks: overdue, due today, and up next tasks
     */
    private scheduleReminder() {
        if (this.overdue.length > 0) {
            this.overdue.forEach(task => {
                this.sendTaskReminder(task)
            });
        }

        if (this.today.length > 0) {
            this.today.forEach(task => {
                this.sendTaskReminder(task)
            });
        }

        if (this.nextup.length > 0) {
            this.nextup.forEach(task => {
                this.sendTaskReminder(task)
            });
        }
    }

    /**
     * Refresh notifications:
     * clear scheduled notifications, pull and sort tasklist, and schedule new task notifications
     */
    public refresh() {
        //  cancel schedueled notification
        if (this.scheduledReminder != null) {
            clearTimeout(this.scheduledReminder)
            this.scheduledReminder = null
        }
        //  pulls task list without completed or deleted tasks
        this.tasks = this.taskMgr.getTasks().filter(
            t => {
                return !t.completed && !t.deleted
            }
        )
        this.remindersContainer.render()
        // re-sorts notif list in order of due date
        this.tasks.sort(
            (t1, t2) => {
                return t1.due.valueOf() - t2.due.valueOf()
            }
        )

        // creates sublist of overdue tasks
        this.overdue = this.tasks.filter(
            t=> {
                return (t.dueIn < 0)
            }
        )

        // creates sublist of tasks due today
        this.today = this.tasks.filter(
            t=> {
                return (t.dueIn == 0)
            }
        )

        // creates sublist of tasks due the next day tasks are due
        this.nextup = this.tasks.filter(
            t=> {
                return (t.dueIn > 1)
            }
        )
        this.nextup = this.nextup.filter(
            // t=>{
            //     return(t.due == this.nextup[0].due)
            // } // NextUp
            t=>{
                // @ts-ignore
                return(t.dueIn <= document.getElementById("taskreminderbuffer")!.value)
            }
        )
        // Schedule reminders for: overdue, today and nextup tasks
        this.scheduleReminder()

    }
}
