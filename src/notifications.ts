import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/api/notification";
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

    private interval: number // milliseconds

    private scheduledReminder: NodeJS.Timeout | null = null
    private isRunning: boolean = false

    constructor(startTime: string, endTime: string, interval: number) {
        this.startTime = startTime
        this.endTime = endTime
        this.interval = interval
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

        sendNotification({
            title: "Just Checking In!",
            body: "Are you finding it hard to be productive? Click me for some help!"
        })
        if (this.checkIsInTimeRange(this.interval)) {
            this.scheduleReminder()
        }
    }

    remindersActive() {
        return this.isRunning
    }

    start() {
        if (this.isRunning || this.scheduledReminder != null) {
            return
        }

        this.isRunning = true
        this.scheduleReminder()
    }

    stop() {
        if (!this.isRunning && this.scheduledReminder != null) {
            return
        }
        this.isRunning = false
        if (this.scheduledReminder != null) {
            window.clearTimeout(this.scheduledReminder)
        }
    }
}