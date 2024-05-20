import { onLoad } from "./utils";
import { changeTheme } from "./main";

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
        if (tabElement.name == tab) {
            tabElement.className = "tab visible"
        } else if (tabElement.className == "tab visible") {
            tabElement.className = "tab"
        }
    }
}

function themeButtonCallback(event) {
    changeTheme(event.currentTarget.name)
}

function tabChangeCallback(event) {
    var button = event.currentTarget
    var tab = button.name
    changeTab(tab)
}

onLoad(() => {
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
})