import { path } from "@tauri-apps/api"
import { readTextFile, writeTextFile, BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs"
import { Task } from "./task";

const SETTINGS_FN = "settings.json"
const TASKS_FN = "tasks.json"

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
 * Checks to make sure the AppData folder for the App exists.
 */
async function checkAppDataValid() {
    var dirExists = await exists(".", {
        baseDir: BaseDirectory.AppData
    })
    if (!dirExists) {
        await mkdir(await path.appDataDir())
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
        await checkAppDataValid()
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
    await checkAppDataValid()
    var text = JSON.stringify(data)
    await writeTextFile(fn, text, {
        baseDir: BaseDirectory.AppConfig
    })
}

var settingsLoaded = false

var settings = {
    "lastTheme": "light",
    "plannerflipped": false,
    "lasttab": "tasks",
    "checkIns": {
        "start": "",
        "end": "",
        "interval": ""
    }
}

async function saveSettings() {
    await saveFile(settings, SETTINGS_FN)
}

export async function loadSettings() {
    settingsLoaded = true
    settings = await loadFile(SETTINGS_FN, settings)
}

export async function savePlannerFlip(flipped: boolean) {
    settings.plannerflipped = flipped
    await saveSettings()
}

export function setCurrentTab(tab: string) {
    settings.lasttab = tab
}

export async function saveReminderSettings(start: string, end: string, interval: string) {
    if (settings.checkIns == undefined) {
        settings.checkIns = {
            "start": "",
            "end": "",
            "interval": ""
        }
    }

    settings.checkIns.start = start
    settings.checkIns.end = end
    settings.checkIns.interval = interval

    await saveSettings()
}

export async function saveCurrentTab(tab: string) {
    settings.lasttab = tab
    await saveSettings()
}

export async function setLastTheme(theme: string) {
    settings.lastTheme = theme
    await saveSettings()
}

export async function getSettings() {
    if (!settingsLoaded) {
        await loadSettings()
    }
    return settings
}

export async function loadTasks() {
    var tasks: Array<Task> = []
    var loadedJSON = await loadFile(TASKS_FN, [])
    for (let i = 0; i < loadedJSON.length; i++) {
        const t = loadedJSON[i];
        tasks.push(new Task(
            t.name,
            t.size,
            t.importance,
            t.category,
            t.due,
            t.completed
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

window.addEventListener(
    "taskschanged", 
    async (e: CustomEventInit) => {
        await saveTasks(e.detail)
    }
)

window.addEventListener(
    "settingschanged",
    async (_) => {
        await saveSettings()
    }
)