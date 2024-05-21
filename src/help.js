import { onLoad } from "./utils"


export function changeHelpStuff(target) {
    // Change tab to target in all contexts
    var tabs = document.getElementsByClassName("helpcontent")
    for (let i = 0; i < tabs.length; i++) {
        const tabElement = tabs[i];
        if (tabElement.getAttribute("name") == target) {
            tabElement.className = "helpcontent visible"
        } else if (tabElement.className == "helpcontent visible") {
            tabElement.className = "helpcontent"
        }
    }
}