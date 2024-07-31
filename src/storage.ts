import { path } from "@tauri-apps/api"
import { readTextFile, writeTextFile, BaseDirectory, exists, mkdir, remove } from "@tauri-apps/plugin-fs"
import { ListRecord, TaskColor, TaskRecord, colorStrToEnum, onListAdd, onListDelete, onListEdit, onTaskAdd, onTaskAdopt, onTaskComplete, onTaskDelete, onTaskEdit, onTaskUncomplete } from "./task";
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
        // await saveFile(defaultdata, fn)
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

// Legacy TaskRecord translator et al.
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

    function recursiveTypeFix(taskList: TaskRecord[]): TaskRecord[] {
        return taskList.map(t => {
            t.name = String(t.name),
            t.size = Number(t.size),
            t.importance = Number(t.importance),
            t.due = new Date(t.due).valueOf()
            t.completed = Boolean(t.completed),
            t.id = String(t.id),
            t.subtasks = recursiveTypeFix(t.subtasks)
            return t
        })
    }
    
    async function migrateTasks(lists: ListRecord[]) {
        await invoke("migrate_tasks", {
            lists: lists.map(l => {
                l.name = String(l.name)
                l.uuid = String(l.uuid)
                l.color = Number(l.color)
                l.tasks = recursiveTypeFix(l.tasks)
                return l
            })
        })
    }
// End

export async function loadTasks(): Promise<ListRecord[]> {
    var loadedJSON = await loadFile(
        TASKS_FN, 
        {
            "format": 3,
            "tasks": []
        }
    )

    var formatted =  await formatTasks(loadedJSON)
    if (formatted.length != 0) {
        await saveFile(loadedJSON, "tasks-json-backup.json")
        message("Your Tasks, as stored on the disk, have been updated to a new and improved format! A backup of the previous file has been created, just in case :)")
        await remove(TASKS_FN, {
            baseDir: BaseDirectory.AppConfig
        })
        await migrateTasks(formatted)
        return formatted
    }

    return await invoke("load_tasks")
}

var blockTaskSave: boolean = false

window.addEventListener(
    "blocktasksave",
    _ => blockTaskSave = true
);

async function saveList(command: string, list: ListRecord) {
    const res: boolean = await invoke(
        command, {
            list: list
        }
    )
    if (!res) {
        console.warn(`Failed to save list ${list.name} (${list.uuid}). Rust function (${command}) returned false.`)
    }
}

onListAdd(async e => {
    await saveList("add_list", e.list)
})

onListEdit(async e => {
    await saveList("edit_list", e.list)
})

onListDelete(async e => {
    await saveList("delete_list", e.list)
})

async function saveTask(command: string, list: string, task: TaskRecord, parent: string | null = null) {
    const res: boolean = await invoke(
        command, {
            list: list,
            task: task,
            parent: parent
        }
    )
    if (!res) {
        console.warn(`Failed to save list ${task.name} (${task.id}). Rust function (${command}) returned false.`)
    }
}

onTaskAdd(async e => {
    await saveTask("add_task", e.listUUID, e.task)
})

onTaskAdopt(async e => {
    await saveTask("add_task", e.listUUID, e.task, e.parent!)
})

onTaskEdit(async e => {
    await saveTask("edit_task", e.listUUID, e.task)
})

onTaskComplete(async e => {
    await saveTask("edit_task", e.listUUID, e.task)
})

onTaskUncomplete(async e => {
    await saveTask("edit_task", e.listUUID, e.task)
})

onTaskDelete(async e => {
    await saveTask("delete_task", e.listUUID, e.task)
})