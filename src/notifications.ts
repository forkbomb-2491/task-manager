import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { todayDateString } from "./utils";

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
        "1. Just checking in!": "1. Are you finding it hard to be productive? Open Task Manager for some help!",
        "2. You're doing great!": "2. Need any suggestions for what to do?  Open Task Manager for some help!",
        "3. Don't give up!": "3. Struggling to stay motivated? Open Task Manager for some help!"
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
        console.log(interval)
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