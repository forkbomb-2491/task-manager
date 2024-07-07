// @vitest-environment jsdom
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDoc, getTask } from './testutils'
import { TaskManager } from "../taskmanager"
import { Planner } from '../planner'
import { DayCols } from '../utils'

var taskMgr: TaskManager
var planner: Planner

beforeEach(() => {
    mockDoc()
    taskMgr = new TaskManager()
    // @ts-ignore
    planner = taskMgr.planner
    planner.render()
})

describe("Planner Tests", () => {
    it("Adding Task Adds to Planner", () => {
        const task = getTask()
        taskMgr.addTask(task)
        var kids = document.getElementById(DayCols[new Date().getDay()])!.children
        assert.equal(kids.length, 4)
    })

    it("Completing Task Applied to Element", () => {
        const task = getTask()
        taskMgr.addTask(task)
        var element = document.getElementById(DayCols[new Date().getDay()])!.children[3]
        task.toggleCompleted()
        assert.isTrue(element.className.includes("completed"))
    })

    it("Deleting Task Removes", () => {
        const task = getTask()
        taskMgr.addTask(task)
        var col = document.getElementById(DayCols[new Date().getDay()])!
        assert.equal(col.children.length, 4)
        task.delete()
        assert.equal(col.children.length, 3)
    })

    it("Shifting Causes Render", () => {
        const spy = vi.spyOn(planner, "render")
        // @ts-ignore
        planner.shiftLeft(1)
        // @ts-ignore
        planner.shiftRight(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("Subtasks Add to Planner", () => {
        const task = getTask()
        taskMgr.addTask(task)
        task.adoptChild(getTask())
        var kids = document.getElementById(DayCols[new Date().getDay()])!.children
        assert.equal(kids.length, 5)
    }) 
})

