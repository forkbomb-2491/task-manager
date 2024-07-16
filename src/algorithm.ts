import { invoke } from "@tauri-apps/api/core";
import { Task, TaskRecord, onTaskAdd, onTaskComplete, onTaskDelete, onTaskUncomplete } from "./task";

export async function clearDueEvents() {
    await invoke("clear_due_events")
}

export async function recordCreateEvent(task: Task | TaskRecord, list: string) {
    await invoke("record_create_event", {
        id: task.id,
        color: list,
        importance: task.importance,
        size: task.size,
        due: task.due.valueOf()
    })
}

export async function recordCompleteEvent(task: Task | TaskRecord, list: string) {
    await invoke("record_complete_event", {
        id: task.id,
        color: list,
        importance: task.importance,
        size: task.size,
        due: task.due.valueOf()
    })
}

export async function getSuggestedDueDateOffset(size: number, importance: number, list: string): Promise<number> {
    return await invoke("get_suggested_due_offset", {
        size: size,
        importance: importance,
        list: list
    })
}

async function removeDueEvent(taskId: string, create: boolean, complete: boolean) {
    await invoke("remove_due_event", {
        id: taskId,
        create: create,
        complete: complete
    })
}

onTaskAdd(e => {
    if (e.listUUID == null) {
        console.error("Tried to save task event to DB, but no list UUID was provided.")
    }
    recordCreateEvent(e.task, e.listUUID!).then()
})

onTaskComplete(e => {
    if (e.listUUID == null) {
        console.error("Tried to save task event to DB, but no list UUID was provided.")
    }
    recordCompleteEvent(e.task, e.listUUID!).then()
})

onTaskUncomplete(e => {
    removeDueEvent(e.task.id, false, true)
})

onTaskDelete(e => {
    removeDueEvent(e.task.id, true, true)
})