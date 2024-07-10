// @ts-nocheck
import { readFileSync } from "fs"
import path from "path"
import { Task } from "../task"

var eventListeners: any[][]
/**
 * Removes window's event listeners (prevents errors thrown ancillary to test results)
 */
export function clearEvents() {
    if (eventListeners == undefined) {
        eventListeners = []
        window.ogAddEventListener = window.addEventListener
        window.addEventListener = (type, listener) => {
            eventListeners.push([type, listener])
            window.ogAddEventListener(type, listener)
        }
    } else {
        eventListeners.forEach(entry => {
            window.removeEventListener(entry[0], entry[1])
        })
    }
}

/**
 * Loads the app's HTML (and resets window's event listeners)
 */
export function mockDoc() {
    clearEvents()
    loadIndex()
    loadTabs()
}

/**
 * Creates a new Task
 * @returns Task
 */
export function getTask(size: number = 1, importance: number = 4) {
    const now = new Date()
    return new Task("Test", size, importance, "test", new Date(now.getFullYear(), now.getMonth(), now.getDate()))
}

function loadIndex() {
    document.body.innerHTML = readFileSync(path.resolve(__dirname, "../../index.html")).utf8Slice()
}

function loadTabs() {
    var tabs = [...document.getElementsByClassName("tab")]
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabName = tab.getAttribute("name")
        var tabHTML = readFileSync(path.resolve(__dirname, `../tabs/${tabName}.html`)).utf8Slice()
        tab.innerHTML = tabHTML
    }
}