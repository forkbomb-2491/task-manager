// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskManager } from "../taskmanager";
// @ts-ignore
import { mockDoc, getTask } from './testutils'
var taskMgr: TaskManager
beforeEach(() => {
    mockDoc()
    taskMgr = new TaskManager()
    // @ts-ignore
    taskMgr.render()
})

describe("Focus Event Checks", () => {
    it("Task List Refreshes on Focus", () => {
        // @ts-ignore
        const taskList = taskMgr.taskList
        const spy = vi.spyOn(taskList, "refresh")
        window.dispatchEvent(new Event("focus"))
        expect(spy).toHaveBeenCalled()
    })

    it("Planner Refreshes on Focus", () => {
        // @ts-ignore
        const planner = taskMgr.planner
        const spy = vi.spyOn(planner, "refresh")
        window.dispatchEvent(new Event("focus"))
        expect(spy).toHaveBeenCalled()
    })
    
    it("Help Manager Renders on Focus", () => {
        // @ts-ignore
        const helpMgr = taskMgr.helpMgr
        const spy = vi.spyOn(helpMgr, "render")
        window.dispatchEvent(new Event("focus"))
        expect(spy).toHaveBeenCalled()
    })

    it("TaskPLan Refreshes on Focus", () => {
        // @ts-ignore
        const taskPlanner = taskMgr.taskPlanner
        const spy = vi.spyOn(taskPlanner, "refresh")
        window.dispatchEvent(new Event("focus"))
        expect(spy).toHaveBeenCalled()
    })
})