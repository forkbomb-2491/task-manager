import { onLoad } from "./utils";
import { changeTheme } from "./main";
import { addPlannerTask, switchPlannerOrientation } from "./planner"
import { getSettings, loadTasks, saveTasks, SettingsChanged, getTasksChanged } from "./storage"
import { addThemeButtonCallbacks, addTabButtonCallbacks, addHelpButtonCallbacks } from "./setup"
import { Task } from "./task"
import { sendNotif } from "./notifications"

var tasks = []
var tabs = {
    tasks: document.getElementById("taskstab").contentDocument,
    planner: document.getElementById("plannertab").contentDocument,
    pomodoro: document.getElementById("pomodorotab").contentDocument,
    eisenhower: document.getElementById("eisenhowertab").contentDocument,
    dopamenu: document.getElementById("dopamenutab").contentDocument,
    help: document.getElementById("helptab").contentDocument,
    reminders: document.getElementById("reminderstab").contentDocument,
    settings: document.getElementById("settingstab").contentDocument,
}
window.tabs = tabs

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
    var title = form.titleinput.value
    var cat = form.catinput.value
    var date = form.deadlineday.value
    var day = form.deadlineday.selectedOptions.item(0).getAttribute("name")
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

    var days = tabs.planner.getElementsByClassName("daycolumn")
    days[day].className += " today"
}


function applyStylesToTabs() {
    var styles = document.getElementsByTagName("link")
    for (const tab in tabs) {
        if (Object.hasOwnProperty.call(tabs, tab)) {
            const element = tabs[tab];
            for (let i = 0; i < styles.length; i++) {
                const style = styles[i];
                tab.head.appendChild(style)
            }
        }
    }
}

onLoad(async () => {
    addThemeButtonCallbacks()
    addTabButtonCallbacks()
    addHelpButtonCallbacks()

    tabs.planner.getElementById("switchplanner").addEventListener(
        "click",
        (e) => { switchPlannerOrientation() }
    )

    tabs.settings.getElementById("notiftestbutton").addEventListener(
        "click",
        async (e) => {
            await sendNotif("urmom", "gottem lolololololololol")
        }
    )

    highlightCurrentDay()
    var settings = await getSettings()
    await changeTheme(settings.lastTheme)
    if (settings.plannerflipped) {
        switchPlannerOrientation()
    }

    tasks = await loadTasks()
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        task.completeCallback = taskCompleteCallback
        task.deleteCallback = deleteTaskCallback

        addPlannerTask(task.getPlannerElement(), (task.due.slice(0, 3) + "col").toLowerCase())

        if (task.completed) {
            document.getElementById("completedtasklist").appendChild(task.getTaskListElement())
        } else {
            document.getElementById("currenttasklist").appendChild(task.getTaskListElement())
        }
    }

    applyStylesToTabs()
})