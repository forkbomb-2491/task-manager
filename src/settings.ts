import { Store } from "@tauri-apps/plugin-store";
import { CheckInHandler } from "./notifications";
import { Weekdays, getElement, onWindowFocused, registerShowHideButton } from "./utils";
import { SETTINGS_PATH } from "./storage";
import { getVersion } from "@tauri-apps/api/app";
import { isAuthenticated, logInWithToken, logOut, signIn } from "./http";
import { Update, check } from "@tauri-apps/plugin-updater";
import { loadBugReport } from "./feedback";

/**
 * Controls the Settings tab's UI elements and responds to (most) changes.
 * Some settings changed are still handled in main. (<- TO DO)
 */
export class SettingsView {
    // @ts-ignore
    private reminderSettings: HTMLFormElement = document.getElementById("remindersettings")!
    // @ts-ignore
    private tabSettings: HTMLFormElement = document.getElementById("tabsettings")!
    // @ts-ignore
    private themeSelector: HTMLFormElement = document.getElementById("themeselector")!

    private checkInHandler: CheckInHandler | undefined
    private settings: Settings

    private update: Update | undefined

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

        registerShowHideButton("notifsettingsshowhide", "notifsettingsdiv")
        registerShowHideButton("plannersettingsshowhide", "plannersettingsdiv")
        registerShowHideButton("helpsettingsshowhide", "helpsettingsdiv")
        registerShowHideButton("displaysettingsshowhide", "displaysettingsdiv")

        this.checkForUpdates().then()
        onWindowFocused(() => this.checkForUpdates().then())
    }

    private async checkForUpdates() {
        if (this.update != undefined) return
        
        var update = await check()
        if (update != null) {
            document.getElementById("updateversionlabel")!.innerText = update.version
            document.getElementById("updatenotesdiv")!.innerText = update.body!
            document.getElementById("installupdatebutton")!.addEventListener(
                "click",
                _ => this.installUpdate(update!).then()
            )
            document.getElementById("updatecontainer")!.style.display = "block"
        }
    }

    private async installUpdate(update: Update) {
        document.getElementById("installupdatebutton")!.style.display = "none"
        const statusLabel = document.getElementById("installstatuslabel")!
        statusLabel.innerText = "Starting download..."
        statusLabel.style.display = "block"
        var size: number
        await update.downloadAndInstall((
            e => {
                if (e.event == "Started") {
                    statusLabel.innerText = "Download started..."
                    size = e.data.contentLength!
                } else if (e.event == "Progress") {
                    statusLabel.innerText = `Downloading... ${
                        Math.round(e.data.chunkLength/size * 100)
                    }% Complete`
                } else {
                    statusLabel.innerText = "✅ Install Complete! Please relaunch Task Manager."
                }
            }
        ))
    }

    /**
     * This loads the Settings UI. This starts the CheckInHandler and the
     * Settings tab's UI elements to reflect the user's previously selected
     * settings.
     */
    load() {
        this.loadCheckInHandler().then()

        getVersion().then(v => document.getElementById("versionlabel")!.innerHTML += v)

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
                // @ts-ignore
                const element: HTMLInputElement = document.getElementById("checkinenabled")!
                this.settings.checkinsEnabled = element.checked
            }
        )

        document.getElementById("remindersenabled")!.addEventListener(
            "change",
            _ => {
                // @ts-ignore
                const element: HTMLInputElement = document.getElementById("remindersenabled")!
                this.settings.remindersEnabled = element.checked
            }
        )

        document.getElementById("syncenabled")!.addEventListener(
            "change",
            _ => {
                // @ts-ignore
                const element: HTMLInputElement = document.getElementById("syncenabled")!
                this.settings.syncEnabled = element.checked
                this.syncSettingsChange(element.checked).then()
            }
        )

        document.getElementById("tabsettings")!.addEventListener(
            "change",
            _ => {
                this.settings.tabsActive = {
                    // @ts-ignore
                    "planner": document.getElementById("planneractive")!.checked,
                    // @ts-ignore
                    "taskplan": document.getElementById("tpactive")!.checked,
                    // @ts-ignore
                    "pomodoro": document.getElementById("pomodoroactive")!.checked,
                    // @ts-ignore
                    "eisenhower": document.getElementById("eisenhoweractive")!.checked,
                    // @ts-ignore
                    "dopamenu": document.getElementById("dopamenuactive")!.checked,
                    // @ts-ignore
                    "reminders": document.getElementById("remindersactive")!.checked
                }
            }
        )

        document.getElementById("helplabelinput")!.addEventListener(
            "change",
            e => {
                // @ts-ignore
                if (e.currentTarget!.value.length < 1) return
                // @ts-ignore
                this.settings.helpTabName = e.currentTarget!.value
            }
        )

        document.getElementById("bugbutton")!.addEventListener("click", _ => loadBugReport())

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


        const syncCheckbox = document.getElementById("syncenabled")!
        // @ts-ignore
        syncCheckbox.checked = this.settings.syncEnabled

        if (this.settings.syncEnabled) {
            this.syncSettingsChange(true).then()
        }

        document.getElementById("syncsigninform")!.addEventListener(
            "submit",
            e => {
                e.preventDefault()
                this.syncSignInFormSubmit()
            }
        )

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

        var tabsActive = this.settings.tabsActive
        // @ts-ignore
        document.getElementById("planneractive")!.checked = tabsActive.planner
        // @ts-ignore
        document.getElementById("tpactive")!.checked = tabsActive.taskplan
        // @ts-ignore
        document.getElementById("pomodoroactive")!.checked = tabsActive.pomodoro
        // @ts-ignore
        document.getElementById("eisenhoweractive")!.checked = tabsActive.eisenhower
        // @ts-ignore
        document.getElementById("dopamenuactive")!.checked = tabsActive.dopamenu
        // @ts-ignore
        document.getElementById("remindersactive")!.checked = tabsActive.reminders

        // @ts-ignore
        document.getElementById("helplabelinput")!.value = this.settings.helpTabName
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

    private syncSignedIn() {
        getElement("syncinfo").style.display = "none"
        getElement("syncsigninbox").style.display = "none"
        getElement("syncbuttonbox").style.display = "block"
    }
    
    private async syncSignInFormSubmit() {
        getElement("syncinfo").style.display = "block"
        getElement("syncinfo").innerHTML = "Signing in..."
        getElement("syncsigninbox").style.display = "none"

        // @ts-ignore
        var form: HTMLFormElement = document.getElementById("syncsigninform")!
        const uname = form.username.value
        const passwd = form.password.value

        form.reset()

        try {
            const token = await signIn(uname, passwd)
            this.settings.syncToken = token
            this.syncSignedIn()
        } catch (error) {
            getElement("syncinfo").innerHTML = "<element style='color: red;'>Username or password incorrect. Please try again.</element>"
            getElement("syncsigninbox").style.display = "block"
        }
    }

    private async syncSettingsChange(newStatus: boolean) {
        if (newStatus) {
            getElement("syncinfo").innerHTML = "Checking your sync status..."
            getElement("syncinfo").style.display = "block"
            var isAuthed = await isAuthenticated()
            if (!isAuthed) {
                if (this.settings.syncToken != "" && await logInWithToken(this.settings.syncToken)) return this.syncSignedIn()
                getElement("syncinfo").style.display = "none"
                getElement("syncsigninbox").style.display = "block"
                return
            }
            this.syncSignedIn()
        } else {
            getElement("syncinfo").style.display = "none"
            getElement("syncsigninbox").style.display = "none"
            getElement("syncbuttonbox").style.display = "none"

            await logOut(this.settings.syncToken)
            this.settings.syncToken = ""
        }
    }
}

/**
 * The different types of Settings events the Settings class may dispatch or to
 * which it may respond. 
 */
enum SettingsEventType {
    "change" // When a setting is changed, or a non-default value is loaded
}

/**
 * An Event that Settings can dispatch or receive. The event contains a
 * "setting" field and "value" field, the purposes of which are self-
 * evident.
 */
export class SettingsEvent extends Event {
    private _setting: string
    private _value: any

    /**
     * The setting about which the Event is concerned.
     */
    get setting(): string { return this._setting }

    /**
     * The value (if any) that has been mutated (usually associated with)
     * `change` Events.
     */
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

/**
 * Helper method for registering callbacks for settings changes. Further,
 * it filters by setting which Events your callback will receive.
 * @param setting Setting of interest
 * @param cb Callback that takes a SettingsEvent argument.
 */
export function onSettingChange(setting: string, cb: (event: SettingsEvent) => void) {
    window.addEventListener(
        "settingchange",
        e => {
            // @ts-ignore
            if (e.setting == setting) { cb(e) }
        }
    )
}

/**
 * Helper method to register callbacks for when settings are loaded from the
 * disk.
 * @param cb Callback method taking no arguments.
 */
export function onSettingsLoad(cb: () => void) {
    window.addEventListener("settingsloaded", _ => cb())
}

/**
 * The Settings class manages all settings values, loading and storing to the
 * disk, and handles Event dispatches when settings are changed.
 */
export class Settings {
    private store: Store
    private entries: [key: string, value: unknown][] = []

    private _isLoaded: boolean = false
    /**
     * Indicates whether settings have been loaded from the disk.
     */
    get isLoaded(): boolean {
        return this._isLoaded
    }

    constructor() {
        this.store = new Store(SETTINGS_PATH)
    }

    /**
     * Loads settings from the disk. Note this method calls asynchronous
     * functions and thus returns before settings are loaded. (Use
     * onSettingsLoaded or onSettingChange callbacks to handle settings after
     * they are loaded)
     */
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
                })
            }).catch(_ => {
                this.store.save().then()
                this._isLoaded = true
                window.dispatchEvent(new Event("settingsloaded"))
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

    /**
     * The last Theme selected by the user. (default: light)
     */
    get lastTheme(): string {
        return this.getKey("theme", "light")
    }

    set lastTheme(theme: string) {
        this.setKey("theme", theme)
    }

    /**
     * Whether the planner presents the days as a list. (default: false)
     */
    get plannerFlipped(): boolean {
        return this.getKey("plannerFlipped", false)
    }

    set plannerFlipped(val: boolean) {
        this.setKey("plannerFlipped", val, false)
    }

    /**
     * The Tab last switched to by the user. (default: Tasks)
     */
    get lastTab(): string {
        return this.getKey("lastTab", "tasks")
    }

    set lastTab(tab: string) {
        this.setKey("lastTab", tab)
    }

    /**
     * The day of the week that appears first by default in the Planner. (And
     * when the "This Week" button is pressed. default: Sunday)
     */
    get plannerStartDay(): Weekdays {
        return this.getKey("plannerStartDay", 0)
    }

    set plannerStartDay(day: Weekdays) {
        this.setKey("plannerStartDay", day)
    }

    /**
     * The number of recommendations offered by the Help tab. (default: 8)
     */
    get recListLength(): number {
        return this.getKey("recListLength", 8)
    }

    set recListLength(len: number) {
        this.setKey("recListLength", len)
    }

    /**
     * Whether regular productivity Check-In notifications are sent by Task 
     * Manager. (default: true)
     */
    get checkinsEnabled(): boolean {
        return this.getKey("checkinsEnabled", true)
    }

    set checkinsEnabled(val: boolean) {
        this.setKey("checkinsEnabled", val)
    }

    /**
     * Whether notifications concerning tasks are sent by Task Manager.
     * (default: true)
     */
    get remindersEnabled(): boolean {
        return this.getKey("remindersEnabled", true)
    }

    set remindersEnabled(val: boolean) {
        this.setKey("remindersEnabled", val)
    }

    /**
     * All Check-In settings, including start time, end time, interval, and
     * days enabled.
     */
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

    get helpTabName(): string {
        return this.getKey("helpTabName", "💡")
    }

    set helpTabName(name: string) {
        this.setKey("helpTabName", name)
    }

    get tabsActive(): TabsActive {
        return this.getKey("tabsActive", {
            "planner": true,
            "taskplan": true,
            "pomodoro": true,
            "eisenhower": false,
            "dopamenu": false,
            "reminders": true
        })
    }

    set tabsActive(tabs: TabsActive) {
        this.setKey("tabsActive", tabs)
    }

    get syncToken(): string {
        return this.getKey("syncToken", "")
    }

    set syncToken(token: string) {
        this.setKey("syncToken", token, false)
    }

    get syncEnabled(): boolean {
        return this.getKey("syncEnabled", false)
    }

    set syncEnabled(val: boolean) {
        this.setKey("syncEnabled", val)
    }
}

export type TabsActive = {
    "planner": boolean,
    "taskplan": boolean,
    "pomodoro": boolean,
    "eisenhower": boolean,
    "dopamenu": boolean,
    "reminders": boolean
}

type CheckInSettings = {
    "startTime": string,
    "endTime": string,
    "interval": number,
    "daysEnabled": boolean[]
}