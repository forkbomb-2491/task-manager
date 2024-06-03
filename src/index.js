import { onLoad, DayCols } from "./utils";
import { TaskManager, changeTheme } from "./main";
import { switchPlannerOrientation } from "./planner"
import { getSettings, saveReminderSettings, loadTabs } from "./storage"
import { addThemeButtonCallbacks, addTabButtonCallbacks, addHelpButtonCallbacks, changeTab } from "./setup"
import { Task } from "./task"
import { sendNotif, CheckInHandler } from "./notifications"

var checkInHandler = null

var taskMgr

function createTaskCallback(event) {
    event.preventDefault()
    var form = event.srcElement
    window.test = form
    var title = form.titleinput.value
    var cat = form.catinput.value
    var date = form.deadlineinput.valueAsDate
    var size = form.sizeinput.selectedOptions.item(0).getAttribute("name")
    var importance = form.importanceinput.selectedOptions.item(0).getAttribute("name")

    var task = new Task(title, size, importance, cat, date, false)
    taskMgr.addTask(task)
}
window.createTaskCallback = createTaskCallback

async function changeNotifSettingsCallback(event) {
    event.preventDefault()
    var form = event.srcElement
    var startTime = form.notifstart.value
    var endTime = form.notifend.value
    var sliderValue = form.notifintervalslider.value

    if (checkInHandler != null) {
        checkInHandler.setStartTime(startTime)
        checkInHandler.setEndTime(endTime)
        checkInHandler.setInterval(Number(sliderValue) * 60_000)
        checkInHandler.start()
    } else {
        checkInHandler = new CheckInHandler(startTime, endTime, Number(sliderValue) * 60_000)
        checkInHandler.start()
    }
    await saveReminderSettings(startTime, endTime, sliderValue)
}

onLoad(async () => {
    console.log("h")
    await loadTabs()
    taskMgr = new TaskManager()
    await taskMgr.onLoadCallback()
    
    document.getElementById("remindersettings").addEventListener(
        "submit",
        changeNotifSettingsCallback
    )

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

    document.getElementById("deadlineinput").valueAsDate = new Date()
    document.getElementById("tpdeadlineinput").valueAsDate = new Date()

    var settings = await getSettings()

    if (checkInHandler == null) {
        var startTime, endTime, interval

        try {
            startTime = settings.checkIns.start
            endTime = settings.checkIns.end
            interval = settings.checkIns.interval
            
            checkInHandler = new CheckInHandler(startTime, endTime, Number(interval) * 60_000)
            checkInHandler.start()
        } catch (error) {
            
        }

        window.cih = checkInHandler
    }

    await changeTheme(settings.lastTheme)
    await changeTab(settings.lasttab)
    if (settings.plannerflipped) {
        switchPlannerOrientation()
    }

    document.body.style.display = "block"
})

