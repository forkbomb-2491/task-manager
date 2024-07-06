// @vitest-environment jsdom
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDoc, getTask } from './testutils'
import { TaskManager } from '../task'
import { Planner } from '../planner'
import { DayCols } from '../utils'

var taskMgr: TaskManager
var planner: Planner

beforeEach(() => {
    mockDoc()
    taskMgr = new TaskManager()
    // @ts-ignore
    planner = taskMgr.planner
})

describe("Planner Tests", () => {
    it("Adding Task Adds to Planner", () => {
        const task = getTask()
        taskMgr.addTask(task)
        var kids = document.getElementById(DayCols[new Date().getDay()])!.children
        assert.equal(kids.length, 1)
    })

    it("Completing Task Applied to Element", () => {
        const task = getTask()
        taskMgr.addTask(task)
        var element = document.getElementById(DayCols[new Date().getDay()])!.children[0]
        task.toggleCompleted()
        assert.isTrue(element.className.includes("completed"))
    })

    it("Deleting Task Removes", () => {
        const task = getTask()
        taskMgr.addTask(task)
        var col = document.getElementById(DayCols[new Date().getDay()])!
        assert.equal(col.children.length, 1)
        task.delete()
        assert.equal(col.children.length, 0)
    })

    it("Shifting Causes Render", () => {
        const spy = vi.spyOn(planner, "render")
        // @ts-ignore
        planner.shiftLeft(1)
        // @ts-ignore
        planner.shiftRight(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })
})

