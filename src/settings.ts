import { Store } from "@tauri-apps/plugin-store";
import { CheckInHandler } from "./notifications";
import { StorageManager } from "./storage";
import { Weekdays } from "./utils";

export class SettingsView {
    // @ts-ignore
    private reminderSettings: HTMLFormElement = document.getElementById("remindersettings")!
    // @ts-ignore
    private tabSettings: HTMLFormElement = document.getElementById("tabsettings")!
    // @ts-ignore
    private themeSelector: HTMLFormElement = document.getElementById("themeselector")!

    private storageMgr: StorageManager
    private checkInHandler: CheckInHandler | undefined

    constructor(storageMgr: StorageManager) {
        this.storageMgr = storageMgr

        window.addEventListener(
            "focus",
            _ => {
                if (this.checkInHandler != undefined && !this.checkInHandler.isRunning) {
                    this.checkInHandler.start()
                }
            }
        )
    }

    load() {
        this.loadCheckInHandler().then()

        document.getElementById("remindersettings")!.addEventListener(
            "submit",
            (e) => { this.changeNotifSettingsCallback(e) }
        )

        this.addThemeButtonCallbacks()

        document.getElementById("weekstartform")!.addEventListener(
            "change",
            _ => {
                this.weekStartChangeCallback()
            }
        )

        document.getElementById("reclistslider")!.addEventListener(
            "change",
            _ => {
                this.recListSliderCallback()
            }
        )

        document.getElementById("checkinenabled")!.addEventListener(
            "change",
            _ => {
                console.log("chicken")
                const element = document.getElementById("checkinenabled")!
                // @ts-ignore
                window.dispatchEvent(new BooleanSettingsEvent("checkinchange", element.checked))
                this.storageMgr.setCheckinsEnabled(true).then()
            }
        )

        document.getElementById("remindersenabled")!.addEventListener(
            "change",
            _ => {
                console.log("reminderz")
                const element = document.getElementById("remindersenabled")!
                // @ts-ignore
                window.dispatchEvent(new BooleanSettingsEvent("reminderschange", element.checked))
                this.storageMgr.setRemindersEnabled(true).then()
            }
        )

        this.storageMgr.getLastTheme().then((theme: string) => {
            this.changeTheme(theme)
        })

        this.storageMgr.getRecListLength().then(len => {
            const slider = document.getElementById("reclistslider")!
            // @ts-ignore
            slider.value = len
            const label = document.getElementById("reclistlabel")!
            // @ts-ignore
            label.innerHTML = `${len}`
            window.dispatchEvent(new NumericalSettingsEvent("reclistchange", len))
        })

        this.storageMgr.getCheckinsEnabled().then(val => {
            const checkbox = document.getElementById("checkinenabled")!
            // @ts-ignore
            checkbox.checked = val
            // @ts-ignore
            window.dispatchEvent(new BooleanSettingsEvent("checkinchange", val))
        })

        this.storageMgr.getRemindersEnabled().then(val => {
            const checkbox = document.getElementById("remindersenabled")!
            // @ts-ignore
            checkbox.checked = val
            // @ts-ignore
            window.dispatchEvent(new BooleanSettingsEvent("reminderschange", val))
        })

        this.setSettingsFieldsToSavedValues().then()
    }

    private recListSliderCallback() {
        const slider = document.getElementById("reclistslider")!
        // @ts-ignore
        const val = Number(slider.value)
        window.dispatchEvent(new NumericalSettingsEvent("reclistchange", val))
        this.storageMgr.setRecListLength(val).then()
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

        this.storageMgr.getPlannerStartDay().then(day => {
            var selector = document.getElementById("weekstartform")!
            for (let i = 0; i < selector.getElementsByTagName("input").length; i++) {
                const element = selector.getElementsByTagName("input")[i];
                if (element.value == `${day}`) {
                    element.checked = true
                    break
                }
            }
        })
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

    private weekStartChangeCallback() {
        var selector = document.getElementById("weekstartform")!
        for (let i = 0; i < selector.getElementsByTagName("input").length; i++) {
            const element = selector.getElementsByTagName("input")[i];
            if (element.checked) {
                var newDay = Number(element.value)
                window.dispatchEvent(new NumericalSettingsEvent("weekstartchange", newDay))
                this.storageMgr.setPlannerStartDay(newDay).then()
                break
            }
        }
    }

    private addThemeButtonCallbacks() {
        var themeButtonCallback = (e: Event) => {
            this.themeButtonCallback(e)
        }

        document.getElementById("themeselector")!.addEventListener("change", themeButtonCallback);
    }
}

export class Settings {
    private store: Store
    private entries: [key: string, value: unknown][] = []

    private _isLoaded: boolean = false
    get isLoaded(): boolean {
        return this._isLoaded
    }

    constructor(storageMgr: StorageManager) {
        this.store = storageMgr.store
        this.store.entries().then(ret => {
            this.entries = ret
            this._isLoaded = true
            window.settings = this
        })
    }

    private setKey(key: string, value: any) {
        this.entries = this.entries.filter(e => e[0] != key)
        this.entries.push([key, value])
        this.store.set(key, value).then(_ => this.store.save().then())
    }

    private getKey(key: string, default_: any) {
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            if (entry[0] == key) {
                return entry[1]
            }
        }
        return default_
    }

    get lastTheme(): string {
        return this.getKey("theme", "light")
    }

    set lastTheme(theme: string) {
        this.setKey("theme", theme)
    }

    get plannerFlipped(): boolean {
        return this.getKey("plannerFlipped", false)
    }

    set plannerFlipped(val: boolean) {
        this.setKey("plannerFlipped", val)
    }

    get lastTab(): string {
        return this.getKey("lastTab", "tasks")
    }

    set lastTab(tab: string) {
        this.setKey("lastTab", tab)
    }

    get plannerStartDay(): Weekdays {
        return this.getKey("plannerStartDay", 0)
    }

    set plannerStartDay(day: Weekdays) {
        this.setKey("plannerStartDay", day)
    }

    get recListLength(): number {
        return this.getKey("recListLength", 8)
    }

    set recListLength(len: number) {
        this.setKey("recListLength", len)
    }

    get checkinsEnabled(): boolean {
        return this.getKey("checkinsEnabled", true)
    }

    set checkinsEnabled(val: boolean) {
        this.setKey("checkinsEnabled", val)
    }

    get remindersEnabled(): boolean {
        return this.getKey("remindersEnabled", true)
    }

    set remindersEnabled(val: boolean) {
        this.setKey("remindersEnabled", val)
    }
}

class SettingsEvent extends Event {
    private _value: any
    get value(): any {
        return this._value
    }

    constructor(type: string, value: any) {
        super(type)
        this._value = value
    }
}

class NumericalSettingsEvent extends Event {
    _value: number

    get value(): number {
        return this._value
    }

    constructor(event: string, value: number) {
        super(event)
        this._value = value
    }
}

// @ts-ignore
class StringSettingsEvent extends Event {
    _value: string

    get value(): string {
        return this._value
    }

    constructor(event: string, value: string) {
        super(event)
        this._value = value
    }
}

class BooleanSettingsEvent extends Event {
    _value: boolean

    get value(): boolean {
        return this._value
    }

    constructor(event: string, value: boolean) {
        super(event)
        this._value = value
    }
}