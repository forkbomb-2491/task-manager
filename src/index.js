import { onLoad, DayCols } from "./utils";
import { TaskManager, changeTheme } from "./main";
import { addPlannerTask, switchPlannerOrientation } from "./planner"
import { getSettings, loadTasks, saveTasks, SettingsChanged, getTasksChanged } from "./storage"
import { addThemeButtonCallbacks, addTabButtonCallbacks, addHelpButtonCallbacks, changeTab } from "./setup"
import { Task } from "./task"
import { sendNotif, CheckInHandler } from "./notifications"

var checkInHandler = null

var taskMgr = new TaskManager()

function createTaskCallback(event) {
    event.preventDefault()
    var form = event.srcElement
    window.test = form
    var title = form.titleinput.value
    var cat = form.catinput.value
    var date = form.deadlineinput.value
    var bigness = form.bignessinput.selectedOptions.item(0).getAttribute("name")

    var task = new Task(title, bigness, cat, date, false)
    taskMgr.addTask(task)
}
window.createTaskCallback = createTaskCallback

function changeNotifSettingsCallback(event) {
    event.preventDefault()
}
document.getElementById("remindersettings").addEventListener(
    "submit",
    changeNotifSettingsCallback
)

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
        checkInHandler = new CheckInHandler("10:00", "16:30", 300000)
        window.cih = checkInHandler
        checkInHandler.start()
    }

    var settings = await getSettings()
    await changeTheme(settings.lastTheme)
    await changeTab(settings.lasttab)
    if (settings.plannerflipped) {
        switchPlannerOrientation()
    }
})

