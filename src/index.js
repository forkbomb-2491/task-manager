import { onLoad, DayCols } from "./utils";
import { changeTheme } from "./main";
import { addPlannerTask, switchPlannerOrientation } from "./planner"
import { getSettings, loadTasks, saveTasks, SettingsChanged, getTasksChanged } from "./storage"
import { addThemeButtonCallbacks, addTabButtonCallbacks, addHelpButtonCallbacks, changeTab } from "./setup"
import { Task } from "./task"
import { sendNotif, CheckInHandler } from "./notifications"

var tasks = []
var checkInHandler = null

function sortTaskElements() {
    var currentList = document.getElementById("currenttasklist");
    var completedList = document.getElementById("completedtasklist");
    for (let i = 0; i < currentList.children.length; i++) {
        const task = currentList.children[i];
        if (task.className.includes("completed")) {
            currentList.removeChild(task)
            completedList.appendChild(task)
        }
    }

    for (let i = 0; i < completedList.children.length; i++) {
        const task = completedList.children[i];
        if (!task.className.includes("completed")) {
            completedList.removeChild(task)
            currentList.appendChild(task)
        }
    }
}

function taskCompleteCallback() {
    sortTaskElements()
    window.dispatchEvent(getTasksChanged(tasks))
}

function deleteTaskCallback() {
    window.dispatchEvent(getTasksChanged(tasks))
}

function createTaskCallback(event) {
    event.preventDefault()
    var form = event.srcElement
    window.test = form
    var title = form.titleinput.value
    var cat = form.catinput.value
    var date = form.deadlineinput.value
    var day = DayCols[(new Date(date)).getUTCDay()]
    var bigness = form.bignessinput.selectedOptions.item(0).getAttribute("name")

    var task = new Task(title, bigness, cat, date, false)
    task.completeCallback = taskCompleteCallback
    task.deleteCallback = deleteTaskCallback

    tasks.push(task)

    document.getElementById("currenttasklist").appendChild(task.getTaskListElement())
    addPlannerTask(task.getPlannerElement(), day)

    saveTasks(tasks)
}
window.createTaskCallback = createTaskCallback

function highlightCurrentDay() {
    var date = new Date()
    var day = date.getDay()

    var days = document.getElementsByClassName("daycolumn")
    days[day].className += " today"
}

onLoad(async () => {
    addThemeButtonCallbacks()
    addTabButtonCallbacks()
    addHelpButtonCallbacks()

    document.getElementById("switchplanner").addEventListener(
        "click",
        (e) => { switchPlannerOrientation() }
    )

    document.getElementById("notiftestbutton").addEventListener(
        "click",
        async (e) => {
            await sendNotif("urmom", "gottem lolololololololol")
        }
    )

    if (checkInHandler == null) {
        checkInHandler = new CheckInHandler("13:00", "16:30", 300000)
        window.cih = checkInHandler
        checkInHandler.start()
    }

    highlightCurrentDay()
    var settings = await getSettings()
    await changeTheme(settings.lastTheme)
    await changeTab(settings.lasttab)
    if (settings.plannerflipped) {
        switchPlannerOrientation()
    }

    tasks = await loadTasks()
    window.tasks = tasks
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        task.completeCallback = taskCompleteCallback
        task.deleteCallback = deleteTaskCallback

        addPlannerTask(task.getPlannerElement(), DayCols[(new Date(task.due)).getUTCDay()])

        if (task.completed) {
            document.getElementById("completedtasklist").appendChild(task.getTaskListElement())
        } else {
            document.getElementById("currenttasklist").appendChild(task.getTaskListElement())
        }
    }
})