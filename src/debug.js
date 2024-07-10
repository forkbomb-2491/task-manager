import { message, confirm } from '@tauri-apps/plugin-dialog'
import { loadFile, saveFile } from './storage'
import { Task } from './task'
import { fetch } from '@tauri-apps/plugin-http'

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
    if (await confirm("Are you sure you want to overwrite tasks2.json with tasks.json?")) {
        window.dispatchEvent(new Event("blocktasksave"))
        var v1 = await loadFile("tasks2.json", [])
        await saveFile(v1, "tasks.json")
        message("Done. Restart the app to apply").then()
    }
}

var errorsBound = false
function bindErrors() {
    if (errorsBound) { return }
    errorsBound = true
    console.defaulterror = console.error
    console.error = (data) => {
        message(data, {"kind": "error"}).then()
        console.defaulterror(data)
    }
    console.error("hi")
}

export function addDebugFuncs() {
    window.setSliderMinsTo1 = setSliderMinsTo1
    window.createOverdueTask = createOverdueTask
    window.createTaskTmrw = createTaskTmrw
    window.pullv1Tasks = () => pullv1Tasks().then()
    window.pushv1Tasks = () => pushv1Tasks().then()
    window.tauriFetch = fetch
}