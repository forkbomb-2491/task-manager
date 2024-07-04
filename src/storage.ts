import { path } from "@tauri-apps/api"
import { readTextFile, writeTextFile, BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs"
import { Task, TaskRecord } from "./task";
import { message } from "@tauri-apps/plugin-dialog";

const TASKS_FN = "tasks2.json"

// Checks to make sure the AppData folder for the App exists.
var dirExists = await exists(".", {
    baseDir: BaseDirectory.AppData
})
if (!dirExists) {
    await mkdir(await path.appDataDir())
}

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
export async function loadFile(fn: string, defaultdata: Object) {
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
export async function saveFile(data: Object, fn: string) {
    var text = JSON.stringify(data)
    await writeTextFile(fn, text, {
        baseDir: BaseDirectory.AppConfig
    })
}

// Legacy TaskRecord translator
    type V1TaskRecord = {
        "name": string,
        "size": number,
        "importance": number,
        "category": string,
        "due": Date,
        "completed": boolean,
        "id": string,
        "children": string[],
        "parentId": string | null
    }

    function v1tov2(id: string, v1List: V1TaskRecord[], isChild: boolean): TaskRecord | null {
        var v1IdList: string[] = v1List.map(o => o.id)
        if (!v1IdList.includes(id)) {
            return null
        }
        var old = v1List.filter(e => e.id == id)[0]
        if (old.parentId != null && !isChild) {
            return null
        }
        
        return {
            "name": old.name,
            "size": old.size,
            "importance": old.importance,
            "category": old.category,
            "due": old.due,
            "completed": old.completed,
            "id": old.id,
            // @ts-ignore
            "subtasks": old.children.map(
                id => {
                    return v1tov2(id, v1List, true)
                }
            ).filter(e => e != null)
        }
    }
// End

async function formatTasks(obj: any): Promise<TaskRecord[]> {
    if (!obj.hasOwnProperty("format")) {
        await saveFile(obj, "tasks-v1-backup.json")
        message("Your Tasks, as stored on the disk, have been updated to a new and improved format! A backup of the previous file has been created, just in case :)")
        // @ts-ignore
        return obj.map(i => v1tov2(i.id, obj, false)).filter(i => i != null)
    }
    return obj.tasks
}

export async function loadTasks(): Promise<TaskRecord[]> {
    var loadedJSON = await loadFile(
        TASKS_FN, 
        {
            "format": 2,
            "tasks": []
        }
    )

    return await formatTasks(loadedJSON)
}

var blockTaskSave: boolean = false

export async function saveTasks(tasks: Array<Task>) {
    if (blockTaskSave) {
        console.warn("Tasks not saved--blocked by event.")
        return
    }
    var toSave: Array<Object> = []
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (t.deleted) { continue }
        toSave.push(t.toBasicObject())
    }

    await saveFile(
        {
            "format": 2,
            "tasks": toSave
        }, 
        TASKS_FN
    )
}

window.addEventListener(
    "blocktasksave",
    _ => blockTaskSave = true
)