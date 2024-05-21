import { onLoad } from "./utils";
import { changeTheme, createTaskElement } from "./main";
import { addPlannerTask, createPlannerTaskElement } from "./planner"
import { getSettings } from "./storage"
import { changeHelpStuff } from "./help"

/**
 * Switches displayed tab to the target.
 * @param {string} tab Tab Name
 */
function changeTab(tab) {
    var buttons = document.getElementsByClassName("tabbutton")
    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (button.name == tab) {
            button.className = "tabbutton active"
        } else if (button.className == "tabbutton active") {
            button.className = "tabbutton"
        }
    }

    var tabs = document.getElementsByClassName("tab")
    for (let i = 0; i < tabs.length; i++) {
        const tabElement = tabs[i];
        if (tabElement.getAttribute("name") == tab) {
            tabElement.className = "tab visible"
        } else if (tabElement.className == "tab visible") {
            tabElement.className = "tab"
        }
    }
}

/** Assign as click callback to theme buttons. */
function themeButtonCallback(event) {
    changeTheme(event.currentTarget.name)
}

/** Assign as click callback to tab change buttons. */
function tabChangeCallback(event) {
    var button = event.currentTarget
    var tab = button.name
    changeTab(tab)
}

function createTaskCallback(event) {
    event.preventDefault()
    var form = event.srcElement
    var title = form.titleinput.value
    var cat = form.catinput.value
    var date = form.deadlineday.value
    var day = form.deadlineday.selectedOptions.item(0).getAttribute("name")

    var listTask = createTaskElement(title, cat, date)
    var plannerTask = createPlannerTaskElement(title)

    var deleteTaskCallback = (e) => {
        listTask.remove()
        plannerTask.remove()
    }

    listTask.getElementsByClassName("completed")[0].addEventListener(
        "click",
        deleteTaskCallback
    )
    listTask.getElementsByClassName("deletetask")[0].addEventListener(
        "click",
        deleteTaskCallback
    )

    plannerTask.getElementsByClassName("completed")[0].addEventListener(
        "click",
        deleteTaskCallback
    )

    document.getElementById("tasktab").appendChild(listTask)
    addPlannerTask(plannerTask, day)
}
window.createTaskCallback = createTaskCallback

function highlightCurrentDay() {
    var date = new Date()
    var day = date.getDay()

    var days = document.getElementsByClassName("daycolumn")
    days[day].className += " today"
}

onLoad(async () => {
    var themeButtons = document.getElementsByClassName("themebutton")
    for (let i = 0; i < themeButtons.length; i++) {
        const button = themeButtons[i];
        button.addEventListener("click", themeButtonCallback)
    }

    var tabButtons = document.getElementsByClassName("tabbutton")
    for (let i = 0; i < tabButtons.length; i++) {
        const button = tabButtons[i];
        button.addEventListener("click", tabChangeCallback)
    }

    var helpButtons = document.getElementsByClassName("helpbutton")
    for (let i = 0; i < helpButtons.length; i++) {
        const button = helpButtons[i];
        button.addEventListener(
            "click",
            (e) => {
                changeHelpStuff(e.currentTarget.getAttribute("name"))
            }
        )
    }

    highlightCurrentDay()
    var settings = await getSettings()
    await changeTheme(settings.lastTheme)
})