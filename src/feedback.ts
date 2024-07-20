import { fetch } from "@tauri-apps/plugin-http"
import { showSheet } from "./utils"
import { getVersion } from "@tauri-apps/api/app"
import { type, version } from "@tauri-apps/plugin-os"

export function loadBugReport() {
    const html = `
    <h2>Thank you for reporting your newly found bug to us!</h2>
    <form id="bugreportform">
        <h3>Please briefly describe the bug:</h3>
        <input style="width: 100%;" name="bugdescription" maxlength=200 required>
        <h3>Please describe how we might reproduce the bug:</h3>
        e.g., I changed a task's due date, and it's still under the old date on the Planner tab.
        <textarea style="width: 100%; height: 20rem; min-height: 1.5rem; resize: vertical;" name="bugreproduction" maxlength=1500 required></textarea>
        <input type="submit" class="settingsbutton">
    </form>`
    showSheet("Bug Reporting Form", html)
    document.getElementById("bugreportform")!.addEventListener(
        "submit",
        e => {
            e.preventDefault()
            postFeedback().then()
        }
    )
}

async function postFeedback() {
    // @ts-ignore
    const form: HTMLFormElement = document.getElementById("bugreportform")!
    const description = form.bugdescription.value
    const reproduce = form.bugreproduction.value
    await fetch("https://api.forkbomb2491.dev/bugreport", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: `## Bug Repor\nTM version: ${await getVersion()}; OS: ${type()} ${version()} \n### Bug Description:\n> ${description}\n### Steps to Reproduce Bug:\n>>> ${reproduce}`
        })
    })
    form.replaceWith("You're all set! Thanks a lot!")
}