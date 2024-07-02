import { sendNotification } from "@tauri-apps/plugin-notification";
import { getTimeString } from "./utils";
import { getCurrent, ProgressBarStatus } from "@tauri-apps/api/window";

export class TimerHandler {
    private counter: number // times we swap isBreak. (# of work blocks * 2) -1
    private timer: number // time left in current timer

    private workdurat: number // duration of work block (minutes)
    private breakdurat: number // duration of break block (minutes)

    private completeCallback: () => void

    private intervalId: NodeJS.Timeout | null = null
    public get isRunning(): boolean {
        return this.intervalId != null
    }

    get complete(): boolean {
        return this.counter == 0
    }

    constructor(
        numWorkBlocks: number,
        workDuration: number,
        breakDuration: number,
        completeCallback: () => void
    ) {
        this.counter = numWorkBlocks * 2 - 1
        this.workdurat = workDuration
        this.breakdurat = breakDuration
        this.completeCallback = completeCallback

        this.timer = this.workdurat * 60
        document.getElementById("pomodorotimer")!.innerHTML = getTimeString(this.timer)
        document.getElementById("pomodorostatus")!.innerHTML = "Working..."
    }

    private doTick() {
        this.intervalId = setTimeout(() => {
            this.intervalId = null
            this.timer = this.timer - 1;

            document.getElementById("pomodorotimer")!.innerHTML = getTimeString(this.timer)

            if (this.timer > 0) {
                if (this.counter % 2 == 0) {
                    getCurrent().setProgressBar({
                        status: ProgressBarStatus.Normal,
                        progress: Math.round(this.timer/(this.breakdurat * 60) * 99 + 1)
                    }).then()
                } else {
                    getCurrent().setProgressBar({
                        status: ProgressBarStatus.Normal,
                        progress: Math.round(this.timer/(this.workdurat * 60) * 99 + 1)
                    }).then()
                }
                this.doTick()
            } else {
                this.counter -= 1
                if (this.counter == 0) {
                    this.sendCompleteNotif()
                    this.completeCallback()
                    document.getElementById("pomodorostatus")!.innerHTML = "Completed!"
                    getCurrent().setProgressBar({
                        status: ProgressBarStatus.None
                    }).then()
                } else if (this.counter % 2 == 1) {
                    this.startWorkTimer()
                } else {
                    this.startBreakTimer()
                }
            }
        }, 1000)
    }

    private startWorkTimer() {
        document.getElementById("pomodorotimer")!.innerHTML = getTimeString(this.timer)
        document.getElementById("pomodorostatus")!.innerHTML = "Working..."
        this.sendWorkNotif()
        this.timer = this.workdurat * 60
        this.doTick()
    }
    
    private startBreakTimer() {
        document.getElementById("pomodorotimer")!.innerHTML = getTimeString(this.timer)
        document.getElementById("pomodorostatus")!.innerHTML = "Break!"
        this.sendBreakNotif()
        this.timer = this.breakdurat * 60
        this.doTick()
    }

    start() {
        if (this.isRunning) {
            return
        }

        this.doTick()
    }

    stop() {
        if (!this.isRunning) {
            return
        }
        // Will never be null by definition.
        clearInterval(this.intervalId!)
        this.intervalId = null
    }

    pause() {
        if (this.isRunning) {
            this.stop()
        } else {
            this.start()
        }
    }

    private sendBreakNotif() {
        sendNotification({
            title: "Work time over! Break time begins!",
            body: "Good work! Do something nice during your break! Stretch or get a snack."
        })
    }
    
    private sendWorkNotif() {
        sendNotification({
            title: "Break time over! Work time begins!",
            body: "Let's get to work!"
        })
    }

    private sendCompleteNotif() {
        sendNotification({
            title: "Congratulations",
            body: "You completed this Pomodoro work session! Reward yourself!"
        })
    }
}