import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { todayDateString } from "./utils";
import { Task } from "./task";
import { TaskManager } from "./main";
import { RemindersContainer } from "./reminders.ts";

export async function sendNotif(title: string, body: string) {
    if (!(await isPermissionGranted())) {
        await requestPermission()
    }

    sendNotification({
        title: title,
        body: body
    })
}

export class CheckInHandler {
    private startTime: string
    private endTime: string

    private daysEnabled: boolean[] = [false, false, false, false, false, false, false]

    private interval: number // milliseconds

    private notifcontent: Object = {
        "Just checking in!": "Are you finding it hard to be productive? Open Task Manager for some help!",
        "You're doing great!": "Need any suggestions for what to do?  Open Task Manager for some help!",
        "Don't give up!": "Struggling to stay motivated? Open Task Manager for some help!"
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
    }

    private getStartTimestamp() {
        var dateString = todayDateString() + " " + this.startTime // Local
        return Date.parse(dateString) // Local
    }

    private getEndTimestamp() {
        var dateString = todayDateString() + " " + this.endTime // Local
        return Date.parse(dateString) // Local
    }

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

    private sendReminder() {
        this.scheduledReminder = null
        this.notifnum = Math.floor(Math.random()*Object.keys(this.notifcontent).length)
        
        const notifTitle = Object.keys(this.notifcontent)[this.notifnum];
        sendNotification({
            title: notifTitle,
            // @ts-ignore
            body: this.notifcontent[notifTitle]
        })
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
    private notifList: Task[]
    private remindersContainer: RemindersContainer


    private scheduledReminder: NodeJS.Timeout | null = null
    public get isRunning(): boolean {
        return this.scheduledReminder != null
    }

    constructor(taskMgr: TaskManager){
        this.taskMgr = taskMgr
        this.tasks = []
        this.notifList = []

        this.remindersContainer = new RemindersContainer(this)
        this.remindersContainer.render()
    }

    getNotifTasks(){
        return [...this.notifList]
    }
    
    private sendTaskReminder() {
        var task = this.tasks[0]

        // If you haven't already gotten a notif, send notif
        if (!this.notifList.includes(task)){
            if (task.dueIn < 0) {
                sendNotification({
                    title: "Checking on " + task.name + "!",
                    body: "Have you made any progress on " + task.name + "? It was due " + ((task.dueIn*(-1))-1) + " days ago!"
                })
            } else {
                sendNotification({
                    title: "Checking on " + task.name + "!",
                    body: "Have you made any progress on " + task.name + "? You have " + task.dueIn + " days until it's due!"
                })
            }
            this.notifList.push(task)
            // remove me from list
            this.tasks.shift()

            this.remindersContainer.render()
        }
        // schedule the next notification in list to be day before due date
        this.scheduleReminder()
    }

    private scheduleReminder() {
        // this.refresh()
        var interval: number

        if (this.tasks.length == 0) {
            return
        }
        var task = this.tasks[0]
        
        if (task.dueIn-1 == 0) {
            interval = (task.dueIn-0.5)*86_400_000
        }
        else {
            interval = (task.dueIn-1)*86_400_000
        }

        // console.log(interval)
        this.scheduledReminder = setTimeout(() => { this.sendTaskReminder() }, interval)
    }

    public refresh() {
        //     cancel schedueled notification
        if (this.scheduledReminder != null) {
            clearTimeout(this.scheduledReminder)
            this.scheduledReminder = null
        }
    //     pulls (make sure contains no overdue tasks) and resorts notif list
        this.tasks = this.taskMgr.getTasks().filter(
            t => {
                return !t.completed && !t.deleted
            }
        )
        this.remindersContainer.render()
    //     reschedule first notifications to be noon day before due date
        this.scheduleReminder()
        this.tasks.sort(
            (t1, t2) => {
                return t1.due.valueOf() - t2.due.valueOf()
            }
        )
    }
}
