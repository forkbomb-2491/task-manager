import { Task } from './task'

function setSliderMinsTo1() {
    console.log("urmom")
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
        new Date(new Date() + 86_400_000)
    ))
}

export function addDebugFuncs() {
    window.setSliderMinsTo1 = setSliderMinsTo1
    window.createOverdueTask = createOverdueTask
    window.createTaskTmrw = createTaskTmrw
}