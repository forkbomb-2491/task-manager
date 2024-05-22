import { path } from "@tauri-apps/api"
import { readTextFile, writeTextFile, BaseDirectory, exists, createDir } from "@tauri-apps/api/fs"

const SETTINGS_FN = "settings.json"

var settingsLoaded = false

var settings = {
    "lastTheme": "light",
    "plannerflipped": false
}

async function checkAppDataValid() {
    var dirExists = await exists(".", {
        dir: BaseDirectory.AppData
    })
    if (!dirExists) {
        await createDir(await path.appDataDir())
    }
}

async function saveSettings() {
    await checkAppDataValid()
    var text = JSON.stringify(settings)
    await writeTextFile(SETTINGS_FN, text, {
        dir: BaseDirectory.AppConfig
    })
}

export async function loadSettings() {
    settingsLoaded = true
    try {
        await checkAppDataValid()
        var text = await readTextFile(SETTINGS_FN, {
            dir: BaseDirectory.AppConfig
        })
        settings = JSON.parse(text)
    } catch (error) {
        await saveSettings()
    }
}

export async function savePlannerFlip(flipped: boolean) {
    settings.plannerflipped = flipped
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