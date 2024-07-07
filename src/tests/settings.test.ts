// @vitest-environment jsdom
import { beforeEach, describe } from "vitest";
// @ts-ignore
import { mockDoc, getTask } from './testutils'
mockDoc()

describe("Settings are Applied", () => {
    var tabButtons: HTMLButtonElement[]
    beforeEach(() => {
        mockDoc()
        // @ts-ignore
        tabButtons = [...document.getElementsByClassName("tabbutton")]
    })

    // it("Planner Tab Hides from Event", () => {
    //     var tabsActive = {
    //         "planner": false,
    //         "taskplan": true,
    //         "pomodoro": true,
    //         "eisenhower": true,
    //         "dopamenu": true,
    //         "reminders": true
    //     }
    //     // assert.notEqual(tabButtons.find(val => val.name == "planner")!.style.display, "none")
    //     window.dispatchEvent(new SettingsEvent(0, "tabsActive", tabsActive))
    //     assert.equal(tabButtons.find(val => val.name == "planner")!.style.display, "none")
    // })
})