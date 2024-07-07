// @ts-nocheck
import { readFile, readFileSync } from "fs"
import path from "path"
import { Task } from "../task"

export function mockDoc() {
    loadIndex()
    loadTabs()
}

export function getTask() {
    const now = new Date()
    return new Task("Test", 1, 4, "test", new Date(now.getFullYear(), now.getMonth(), now.getDate()))
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