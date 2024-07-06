import { Task, TaskManager } from "../task";

export function onSettingChange(_: (e: Event) => void) {}

export function onSettingsLoad(_: (e: Event) => void) {}

export class TaskNotifier {
    constructor(_: TaskManager) {}
}

export async function saveTasks(_: Task[]) {}