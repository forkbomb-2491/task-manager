import { path } from "@tauri-apps/api"
import { readTextFile, writeTextFile, BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs"
import { Task } from "./task";
import { Store } from "@tauri-apps/plugin-store";
import { appDataDir, resolve } from "@tauri-apps/api/path";

const TASKS_FN = "tasks.json"

// Checks to make sure the AppData folder for the App exists.
var dirExists = await exists(".", {
    baseDir: BaseDirectory.AppData
})
if (!dirExists) {
    await mkdir(await path.appDataDir())
}

const SETTINGS_PATH = await resolve(await appDataDir()) + "/settings.json"

export class StorageManager {
    private settings: Store

    constructor() {
        this.settings = new Store(SETTINGS_PATH)
        this.settings.load().then()
    }

    async saveSettings() {
        await this.settings.save()
    }

    async getCheckInSettings() {
        return {
            startTime: await this.settings.get("checkInStart"),
            endTime: await this.settings.get("checkInEnd"),
            interval: await this.settings.get("checkInInterval"),
            daysEnabled: await this.settings.get("checkInDaysEnabled")
        }
    }

    async setCheckInSettings(
        startTime: string | null = null, 
        endTime: string | null = null, 
        interval: number | null = null,
        daysEnabled: boolean[] | null = null
    ) {
        if (startTime != null) {
            await this.settings.set("checkInStart", startTime)
        }
        if (endTime != null) {
            await this.settings.set("checkInEnd", endTime)
        }
        if (interval != null) {
            await this.settings.set("checkInInterval", interval * 60_000)
        }
        if (daysEnabled != null && daysEnabled.length == 7) {
            await this.settings.set("checkInDaysEnabled", daysEnabled)
        }
        await this.saveSettings()
    }

    async getLastTheme(): Promise<string> {
        var theme = await this.settings.get("theme")
        if (theme == null) {
            return "light"
        }
        // @ts-ignore; At this point, type will always be correct.
        return theme
    }

    async setLastTheme(theme: string) {
        await this.settings.set("theme", theme)
    }

    async getPlannerFlipped(): Promise<boolean> {
        var ret = await this.settings.get("plannerFlipped")
        if (ret == null) {
            return false
        }
        // @ts-ignore; At this point, type will always be correct.
        return ret
    }

    async setPlannerFlipped(flipped: boolean) {
        await this.settings.set("plannerFlipped", flipped)
    }

    async getLastTab(): Promise<string> {
        var ret = await this.settings.get("lastTab")
        if (ret == null) {
            return "tasks"
        }
        // @ts-ignore; At this point, type will always be correct.
        return ret
    }

    async setLastTab(tab: string) {
        await this.settings.set("lastTab", tab)
    }
}

// LEGACY:

export const SettingsChanged = new Event("settingschanged")
export const getTasksChanged = (tasks: Array<Task>) => { return new CustomEvent("taskschanged", {"detail": tasks}) }

export async function loadTabs() {
    var tabs = [...document.getElementsByClassName("tab")]
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabName = tab.getAttribute("name")
        var tabHTML = await (await fetch(`src/tabs/${tabName}.html`)).text()
        tab.innerHTML = tabHTML
    }
}



/**
 * Loads JSON Data from the disk.
 * @param fn File Name
 * @param defaultdata Default Object
 * @returns Parsed JSON Object
 */
async function loadFile(fn: string, defaultdata: Object) {
    try {
        var text = await readTextFile(fn, {
            baseDir: BaseDirectory.AppConfig
        })
        return JSON.parse(text)
    } catch (error) {
        await saveFile(defaultdata, fn)
        return defaultdata
    }
}

/**
 * Saves the Object to the disk. 
 * @param data Object
 * @param fn File Name
 */
async function saveFile(data: Object, fn: string) {
    var text = JSON.stringify(data)
    await writeTextFile(fn, text, {
        baseDir: BaseDirectory.AppConfig
    })
}

export async function loadTasks() {
    var tasks: Array<Task> = []
    var loadedJSON = await loadFile(TASKS_FN, [])
    for (let i = 0; i < loadedJSON.length; i++) {
        const t = loadedJSON[i];
        console.log(t)
        tasks.push(new Task(
            t.name,
            t.size,
            t.importance,
            t.category,
            t.due,
            t.completed,
            t.id,
            t.children,
            t.parentId
        ))
    }

    return tasks
}

export async function saveTasks(tasks: Array<Task>) {
    var toSave: Array<Object> = []
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (t.deleted) { continue }
        toSave.push(t.toBasicObject())
    }

    await saveFile(toSave, TASKS_FN)
}

