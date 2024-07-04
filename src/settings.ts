import { Store } from "@tauri-apps/plugin-store";
import { CheckInHandler } from "./notifications";
import { } from "./storage";
import { Weekdays } from "./utils";
import { appDataDir, resolve } from "@tauri-apps/api/path";

const SETTINGS_PATH = await resolve(await appDataDir()) + "/settings.json"

export class SettingsView {
    // @ts-ignore
    private reminderSettings: HTMLFormElement = document.getElementById("remindersettings")!
    // @ts-ignore
    private tabSettings: HTMLFormElement = document.getElementById("tabsettings")!
    // @ts-ignore
    private themeSelector: HTMLFormElement = document.getElementById("themeselector")!

    private checkInHandler: CheckInHandler | undefined
    private settings: Settings

    constructor(settings: Settings | null = null) {
        if (settings != null) {
            this.settings = settings
        } else {
            this.settings = new Settings()
        }

        window.addEventListener("settingsloaded", _ => this.load())

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
                // @ts-ignore
                const element: HTMLInputElement = document.getElementById("checkinenabled")!
                this.settings.checkinsEnabled = element.checked
            }
        )

        document.getElementById("remindersenabled")!.addEventListener(
            "change",
            _ => {
                console.log("reminderz")
                // @ts-ignore
                const element: HTMLInputElement = document.getElementById("remindersenabled")!
                this.settings.remindersEnabled = element.checked
            }
        )

        this.changeTheme(this.settings.lastTheme)

        const recListLen = this.settings.recListLength
        // @ts-ignore
        const slider: HTMLInputElement = document.getElementById("reclistslider")!.value = recListLen
        document.getElementById("reclistlabel")!.innerHTML = `${recListLen}`

        
        const checkInBox = document.getElementById("checkinenabled")!
        // @ts-ignore
        checkInBox.checked = this.settings.checkinsEnabled


        const remindersCheckbox = document.getElementById("remindersenabled")!
        // @ts-ignore
        remindersCheckbox.checked = this.settings.remindersEnabled


        this.setSettingsFieldsToSavedValues()
    }

    private recListSliderCallback() {
        const slider = document.getElementById("reclistslider")!
        // @ts-ignore
        const val = Number(slider.value)

        this.settings.recListLength = val
    }

    private setSettingsFieldsToSavedValues() {
        var reminderStgs = this.settings.checkInSettings
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

        var themeSelector = document.getElementById("themeselector")
        for (let i = 0; i < themeSelector!.getElementsByTagName("input").length; i++) {
            const element = themeSelector!.getElementsByTagName("input")[i];
            if (element.value == this.settings.lastTheme) {
                element.checked = true
                break
            }
        }

        var weekStartSelector = document.getElementById("weekstartform")!
        for (let i = 0; i < weekStartSelector.getElementsByTagName("input").length; i++) {
            const element = weekStartSelector.getElementsByTagName("input")[i];
            if (element.value == `${this.settings.plannerStartDay}`) {
                element.checked = true
                break
            }
        }
    }

    private async loadCheckInHandler(): Promise<boolean> {
        var stgs = this.settings.checkInSettings
        
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
        console.log("urmom")

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
            this.checkInHandler.setDaysEnabled(daysEnabled)
            this.checkInHandler.start()
            console.log(this.checkInHandler)
        } else {
            this.checkInHandler = new CheckInHandler(startTime, endTime, Number(sliderValue) * 60_000, daysEnabled)
            this.checkInHandler.start()
        }

        this.settings.checkInSettings = {
            "startTime": startTime, 
            "endTime": endTime, 
            "interval": Number(sliderValue) * 60_000, 
            "daysEnabled": daysEnabled
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
        this.settings.lastTheme = theme
    }

    private weekStartChangeCallback() {
        var selector = document.getElementById("weekstartform")!
        for (let i = 0; i < selector.getElementsByTagName("input").length; i++) {
            const element = selector.getElementsByTagName("input")[i];
            if (element.checked) {
                var newDay = Number(element.value)
                this.settings.plannerStartDay = newDay
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

enum SettingsEventType {
    "change"
}

export class SettingsEvent extends Event {
    private _setting: string
    private _value: any

    get setting(): string { return this._setting }
    get value(): any { return this._value }

    constructor(type: SettingsEventType, setting: string, value: any = null) {
        var eventType: string
        switch (type) {
            case SettingsEventType.change:
                eventType = "settingchange"
                break;
        
            default:
                break;
        }
        super(eventType!)

        this._setting = setting
        this._value = value
    }
}

export function onSettingChange(setting: string, cb: (event: SettingsEvent) => void) {
    window.addEventListener(
        "settingchange",
        e => {
            // @ts-ignore
            if (e.setting == setting) { cb(e) }
        }
    )
}

export function onSettingsLoad(cb: () => void) {
    window.addEventListener("settingsloaded", _ => cb())
}

export class Settings {
    private store: Store
    private entries: [key: string, value: unknown][] = []

    private _isLoaded: boolean = false
    get isLoaded(): boolean {
        return this._isLoaded
    }

    constructor() {
        this.store = new Store(SETTINGS_PATH)
    }

    load() {
        if (!this._isLoaded) {
            this.store.load().then(_ => {
                this.store.entries().then(ret => {
                    this.entries = ret
                    ret.forEach(stg => {
                        window.dispatchEvent(new SettingsEvent(SettingsEventType.change, stg[0], stg[1]))
                    })

                    this._isLoaded = true
                    window.dispatchEvent(new Event("settingsloaded"))
    
                    // @ts-ignore
                    window.settings = this
                })
            })
        }
    }

    private setKey(key: string, value: any, fireEvent: boolean = true) {
        this.entries = this.entries.filter(e => e[0] != key)
        this.entries.push([key, value])
        this.store.set(key, value).then(_ => this.store.save().then())

        if (fireEvent) {
            window.dispatchEvent(new SettingsEvent(SettingsEventType.change, key, value))
        }
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
        this.setKey("plannerFlipped", val, false)
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

    get checkInSettings(): CheckInSettings {
        return {
            "startTime": this.getKey("checkInStart", "12:00"),
            "endTime": this.getKey("checkInEnd", "12:00"),
            "interval": this.getKey("checkInInterval", 60),
            "daysEnabled": this.getKey("checkInDaysEnabled", [false, false, false, false, false, false, false])
        }
    }

    set checkInSettings(stgs: CheckInSettings) {
        this.setKey("checkInStart", stgs.startTime, false)
        this.setKey("checkInEnd", stgs.endTime, false)
        this.setKey("checkInInterval", stgs.interval, false)
        this.setKey("checkInDaysEnabled", stgs.daysEnabled, false)

        window.dispatchEvent(new SettingsEvent(SettingsEventType.change, "checkInSettings", stgs))
    }
}

type CheckInSettings = {
    "startTime": string,
    "endTime": string,
    "interval": number,
    "daysEnabled": boolean[]
}