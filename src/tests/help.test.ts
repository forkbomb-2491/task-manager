// @vitest-environment jsdom
import { assert, beforeEach, describe, it } from 'vitest'
import { getTask, mockDoc } from './testutils'
import { TaskManager } from "../taskmanager"
import { HelpManager } from '../help'
import { SettingsEvent } from '../settings'

var taskMgr: TaskManager
var helpMgr: HelpManager

beforeEach(() => {
    mockDoc()
    taskMgr = new TaskManager()
    // @ts-ignore
    helpMgr = taskMgr.helpMgr
    // @ts-ignore
    taskMgr.render()
})

describe("Help UI & Tasks", () => {
    it("Add Task Adds to Upper Help Panes", () => {
        taskMgr.addTask(getTask(), "Default")
        // @ts-ignore
        helpMgr.panes.slice(0, 3).forEach(pane => {
            // @ts-ignore
            assert.equal(pane.element.children.length, 1)
        })
    })

    it("Completing Task Removes from Recs", () => {
        const task = getTask()
        taskMgr.addTask(task, "Default")
        task.toggleCompleted()
        // @ts-ignore
        helpMgr.panes.forEach(pane => {
            // @ts-ignore
            assert.equal(pane.element.children.length, 0)
        })
    })

    it("Deleting Task Removes from Recs", () => {
        const task = getTask()
        taskMgr.addTask(task, "Default")
        task.delete()
        // @ts-ignore
        helpMgr.panes.forEach(pane => {
            // @ts-ignore
            assert.equal(pane.element.children.length, 0)
        })
    })

    it("Rec List Length Updates via Settings Event", () => {
        for (let i = 0; i < 10; i++) {
            taskMgr.addTask(getTask(), "Default")
        }
        window.dispatchEvent(new SettingsEvent(0, "recListLength", 1))
        // @ts-ignore
        helpMgr.panes.slice(0,3).forEach(pane => {
            // @ts-ignore
            assert.equal(pane.element.children.length, 1)
        })

        window.dispatchEvent(new SettingsEvent(0, "recListLength", 8))
        // @ts-ignore
        helpMgr.panes.slice(0,3).forEach(pane => {
            // @ts-ignore
            assert.equal(pane.element.children.length, 8)
        })
    })
})

// describe("Algo/Ordering Tests", () => {
    
// })