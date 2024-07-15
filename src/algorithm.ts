import { invoke } from "@tauri-apps/api/core";
import { Task, TaskRecord, onTaskAdd, onTaskComplete, onTaskDelete, onTaskUncomplete } from "./task";

export async function clearDueEvents() {
    await invoke("clear_due_events")
}

export async function recordCreateEvent(task: Task | TaskRecord) {
    await invoke("record_create_event", {
        id: task.id,
        color: task.category,
        importance: task.importance,
        size: task.size,
        due: task.due.valueOf()
    })
}

export async function recordCompleteEvent(task: Task | TaskRecord) {
    await invoke("record_complete_event", {
        id: task.id,
        color: task.category,
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
    recordCreateEvent(e.task).then()
})

onTaskComplete(e => {
    recordCompleteEvent(e.task).then()
})

onTaskUncomplete(e => {
    removeDueEvent(e.task.id, false, true)
})

onTaskDelete(e => {
    removeDueEvent(e.task.id, true, true)
})