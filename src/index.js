import { onLoad } from "./utils";
import { changeTheme, createTaskElement } from "./main";
import { addTask } from "./planner"
import { getSettings } from "./storage"

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

function deleteTaskCallback(event) {
    // window.thing = event.currentTarget
    event.currentTarget.parentNode.remove()
}

function createTaskCallback(event) {
    event.preventDefault()
    var form = event.srcElement
    var title = form.titleinput.value
    var cat = form.catinput.value
    var date = form.deadlineday.value
    var task = createTaskElement(title, cat, date)
    task.getElementsByClassName("completed")[0].addEventListener(
        "click",
        deleteTaskCallback
    )
    task.getElementsByClassName("deletetask")[0].addEventListener(
        "click",
        deleteTaskCallback
    )
    document.getElementById("tasktab").appendChild(task)
    addTask(title, "moncol")
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

    highlightCurrentDay()
    var settings = await getSettings()
    await changeTheme(settings.lastTheme)
})