import { message, confirm } from '@tauri-apps/plugin-dialog'
import { loadFile, saveFile } from './storage'
import { Task } from './task'
import { fetch } from '@tauri-apps/plugin-http'
import { requestPermission, Schedule, sendNotification } from '@tauri-apps/plugin-notification'
import { invoke } from '@tauri-apps/api/core'
import { getSuggestedDueDateOffset, recordCompleteEvent, recordCreateEvent } from './algorithm'
import { showSheet } from './utils'
import { loadBugReport } from './feedback'

function theDump() { return document.getElementById("debugDump"); }
function dumpIn(msg) { theDump().innerHTML += msg; }

function setSliderMinsTo1() {
    document.getElementById("workduratslider").min = "1"
    document.getElementById("breakduratslider").min = "1"
    document.getElementById("repeatslider").min = "1"

    document.getElementById("notifintervalslider").min = "1"
}

function createOverdueTask() {
    window.taskMgr.addTask(new Task(
        "overdue",
        4,
        4,
        "Default",
        new Date(new Date() - 86_400_000)
    ))
}

function createTaskTmrw() {
    window.taskMgr.addTask(new Task(
        "tmrw",
        4,
        4,
        "Default",
        new Date(new Date() + 2 * 86_400_000)
    ))
}

async function pullv1Tasks() {
    if (await confirm("Are you sure you want to overwrite tasks2.json with tasks.json?")) {
        window.dispatchEvent(new Event("blocktasksave"))
        var v1 = await loadFile("tasks.json", [])
        await saveFile(v1, "tasks2.json")
        message("Done. Restart the app to apply").then()
    }
}

async function pushv1Tasks() {
    if (await confirm("Are you sure you want to overwrite tasks.json with tasks2.json?")) {
        window.dispatchEvent(new Event("blocktasksave"))
        var v1 = await loadFile("tasks2.json", [])
        await saveFile(v1, "tasks.json")
        message("Done. Restart the app to apply").then()
    }
}

async function clearDueEvents() {
    if (await confirm("Are you sure you want to wipe all due events from the database?")) {
        invoke("clear_due_events").then(
            _ => dumpIn("Success.")
        ).catch(
            e => dumpIn(e)
        )
    }
}

async function pushTasksAsCreates() {
    if (await confirm("Are you sure you want to push all existing tasks to the DB as create events?")) {
        const tasks = window.taskMgr.getTasks()
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            await recordCreateEvent(task, task.list);
        }
        await message("Done.")
    }
}

async function pushTasksAsCompletes() {
    if (await confirm("Are you sure you want to push all completed existing tasks to the DB as completed events?")) {
        const tasks = window.taskMgr.getTasks()
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task.completed) { await recordCompleteEvent(task, task.category); }
        }
        await message("Done.")
    }
}

function testNotif() {
    // const testDate = new Date(new Date().valueOf() + 5000)
    // console.log(testDate)
    sendNotification({
        title: "urmom",
        body: "lolololololololol gottem"
    })
}

export function addDebugFuncs() {
    window.setSliderMinsTo1 = setSliderMinsTo1
    window.createOverdueTask = createOverdueTask
    window.createTaskTmrw = createTaskTmrw
    window.pullv1Tasks = () => pullv1Tasks().then()
    window.pushv1Tasks = () => pushv1Tasks().then()
    window.testNotif = testNotif
    window.tauriFetch = fetch
    window.clearDueEvents = () => clearDueEvents().then()
    window.pushTasksAsCreates = () => pushTasksAsCreates().then()
    window.pushTasksAsCompletes = () => pushTasksAsCompletes().then()

    window.getOffset = (s, i, l) => getSuggestedDueDateOffset(s, i, l).then()
    window.showSheet = showSheet
    window.bugReport = loadBugReport

    window.notifPerm = () => { requestPermission().then() }
}