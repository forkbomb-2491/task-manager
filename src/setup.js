import { changeHelpStuff } from "./help"
import { changeTheme } from "./main"
import { setCurrentTab, SettingsChanged } from "./storage";

/**
 * Switches displayed tab to the target.
 * @param {string} tab Tab Name
 */
export function changeTab(tab) {
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

    setCurrentTab(tab)
    window.dispatchEvent(SettingsChanged)
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

export function addThemeButtonCallbacks() {
    var themeButtons = document.getElementsByClassName("themebutton");
    for (let i = 0; i < themeButtons.length; i++) {
        const button = themeButtons[i];
        button.addEventListener("click", themeButtonCallback);
    }
}

export function addTabButtonCallbacks() {
    var tabButtons = document.getElementsByClassName("tabbutton");
    for (let i = 0; i < tabButtons.length; i++) {
        const button = tabButtons[i];
        button.addEventListener("click", tabChangeCallback);
    }
}

export function addHelpButtonCallbacks() {
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
}