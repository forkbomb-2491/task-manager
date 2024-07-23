import { List, Task } from "../task";
import { TaskManager } from "../taskmanager";

export function onSettingChange(_: (e: Event) => void) {}

export function onSettingsLoad(_: (e: Event) => void) {}

export class TaskNotifier {
    constructor(_: TaskManager) {}
}

export async function saveTasks(_: Task[]) {}

export async function smartDueDate(_: Task, __: List | string) {}