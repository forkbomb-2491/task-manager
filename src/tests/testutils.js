import { readFile, readFileSync } from "fs"
import path from "path"

export function mockDoc() {
    loadIndex()
    loadTabs()
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