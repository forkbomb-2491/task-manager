import { path } from "@tauri-apps/api"
import { readTextFile, writeTextFile, BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs"
import { List, ListRecord, TaskColor, TaskRecord, colorStrToEnum } from "./task";
import { v4 as uuid4 } from 'uuid';
import { message } from "@tauri-apps/plugin-dialog";
import { appDataDir, resolve } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

const TASKS_FN = "tasks2.json"
export const SETTINGS_PATH = await resolve(await appDataDir()) + "/settings2.json";
export const DATABASE_PATH = await resolve(await appDataDir()) + "/history.db";

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

/*

{
    uuid: {
        name: list name
        color: color
        tasks: [
            {
                name...
            }
        ]
    }
}

*/

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

    type V2TaskRecord = {
        "name": string,
        "size": number,
        "importance": number,
        "category": string,
        "due": Date,
        "completed": boolean,
        "id": string,
        "subtasks": V2TaskRecord[]
    }

    function v1tov2(id: string, v1List: V1TaskRecord[], isChild: boolean): V2TaskRecord | null {
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

    function v2SubtasksTov3(list: V2TaskRecord[]): TaskRecord[] {
        return list.map(
            t => {
                return {
                    name: t.name,
                    completed: t.completed,
                    due: t.due.valueOf(),
                    id: t.id,
                    importance: t.importance,
                    size: t.size,
                    subtasks: v2SubtasksTov3(t.subtasks)
                }
            }
        )
    }

    function v2tov3(taskList: V2TaskRecord[]): ListRecord[] {
        var lists: ListRecord[] = []
        taskList.forEach(t => {
            var list: ListRecord | undefined
            for (let i = 0; i < lists.length; i++) {
                const l = lists[i];
                if (TaskColor[l.color] == t.category) {
                    list = l
                    break
                }
            }
            if (list == undefined) {
                list = {
                    name: t.category,
                    color: colorStrToEnum(t.category),
                    tasks: [],
                    uuid: uuid4()
                }
                lists.push(list)
            }
            list!.tasks.push({
                name: t.name,
                completed: t.completed,
                due: t.due.valueOf(),
                id: t.id,
                importance: t.importance,
                size: t.size,
                subtasks: v2SubtasksTov3(t.subtasks)
            })
        })

        return lists
    }
// End

async function formatTasks(obj: any): Promise<ListRecord[]> {
    if (!obj.hasOwnProperty("format")) {
        await saveFile(obj, "tasks-v1-backup.json")
        message("Your Tasks, as stored on the disk, have been updated to a new and improved format! A backup of the previous file has been created, just in case :)")
        // @ts-ignore
        return v2tov3(obj.map(i => v1tov2(i.id, obj, false)).filter(i => i != null))
    } else if (obj.format == 2) {
        await saveFile(obj, "tasks-v2-backup.json")
        message("Your Tasks, as stored on the disk, have been updated to a new and improved format! A backup of the previous file has been created, just in case :)")
        // @ts-ignore
        return v2tov3(obj.tasks)
    }
    return obj.tasks
}

export async function loadTasks(): Promise<ListRecord[]> {
    // return await invoke("load_tasks")
    var loadedJSON = await loadFile(
        TASKS_FN, 
        {
            "format": 3,
            "tasks": []
        }
    )

    return await formatTasks(loadedJSON)
}

var blockTaskSave: boolean = false

export async function saveTasks(tasks: Array<List>) {
    if (blockTaskSave) {
        console.warn("Tasks not saved--blocked by event.")
        return
    }

    await saveFile(
        {
            "format": 3,
            "tasks": tasks.map(t => t.record)
        }, 
        TASKS_FN
    )
}

async function migrateTasks() {
    var lists = await loadTasks()
    console.log(lists)
    await invoke("migrate_tasks", {
        lists: lists
    })
}
// @ts-ignore
window.migrateTasks = () => migrateTasks().then().catch(e => console.error(e));

window.addEventListener(
    "blocktasksave",
    _ => blockTaskSave = true
);
