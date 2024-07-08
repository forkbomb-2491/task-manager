import { message, confirm } from '@tauri-apps/plugin-dialog'
import { loadFile, saveFile } from './storage'
import { Task } from './task'
import { fetch } from '@tauri-apps/plugin-http'

var theDump = () => document.getElementById("debugdump")
var dumpIn = (msg) => theDump().innerHTML += msg + "<br>"

function setSliderMinsTo1() {
    document.getElementById("workduratslider").min = "1"
    document.getElementById("breakduratslider").min = "1"
    document.getElementById("repeatslider").min = "1"

    document.getElementById("notifintervalslider").min = "1"
}

function createOverdueTask() {
    window.taskMgr.addTask(new Task(
        window.taskMgr,
        "overdue",
        4,
        4,
        "Default",
        new Date(new Date() - 86_400_000)
    ))
}

function createTaskTmrw() {
    window.taskMgr.addTask(new Task(
        window.taskMgr,
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

function fetchTasks() {
    fetch("http://localhost/tasks").then(response => {
        console.log(response)
        if (response.ok) {
            response.text().then(str => theDump().innerHTML = str)
        }
    })
}

function postDbg(msg) {
    fetch("http://localhost/tasks", {
        method: "POST",
        headers: {
            "content-type": "text/plain",
            "content-length": msg.length
        },
        body: msg
    }).then(_ => theDump().innerHTML = "sent!").catch(_ => theDump().innerHTML = "sent! (maybe)")
}

function postTasks() {
    var toSend = window.taskMgr.tasks.map(t => t.toBasicObject())
    toSend = JSON.stringify(toSend)
    postDbg(toSend)
}

async function doMockAuth() {
    theDump().innerHTML = ""
    var uuid_ = "d69b4758-45cc-4717-b60a-aace504ac258"
    dumpIn(`UUID: ${uuid_}`)
    dumpIn("Getting token...")
    var response = await fetch("http://localhost/auth", {
        method: "GET",
        headers: {
            "Authorization": uuid_
        }
    })
    if (!response.ok) {
        dumpIn("Response not ok")
        return
    }
    var token = await response.text()
    dumpIn(`Token: ${token}`)
    response = await fetch("http://localhost/tasks", {
        method: "GET",
        headers: {
            "Authorization": token
        }
    })
    dumpIn(await response.text())
}

export function addDebugFuncs() {
    window.setSliderMinsTo1 = setSliderMinsTo1
    window.createOverdueTask = createOverdueTask
    window.createTaskTmrw = createTaskTmrw
    window.pullv1Tasks = () => pullv1Tasks().then()
    window.fetchTasks = fetchTasks
    window.postDbg = postDbg
    window.postTasks = postTasks
    window.doMockAuth = () => doMockAuth().then().catch(e => console.log(e))
}