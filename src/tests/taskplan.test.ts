// @vitest-environment jsdom
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDoc } from './testutils'
import { Task } from '../task'
import { TaskManager } from "../taskmanager"
import { TaskPlanner } from '../taskplan'

var taskMgr: TaskManager
var taskplan: TaskPlanner

beforeEach(() => {
    mockDoc()
    taskMgr = new TaskManager()
    // @ts-ignore
    taskplan = taskMgr.taskPlanner
})

describe("TaskPlan Task Changes", () => {
    it("Adding Task Adds to TaskPlan List", () => {
        const task = new Task("bigenuff", 4, 4, "def", new Date())
        var taskSelect = document.getElementById("tptask")!
        assert.equal(taskSelect.children.length, 0)
        taskMgr.addTask(task)
        assert.equal(taskSelect.children.length, 1)
    })
    
    it("Deleting Task Removes from Selector", () => {
        const task = new Task("bigenuff", 4, 4, "def", new Date())
        var taskSelect = document.getElementById("tptask")!
        taskMgr.addTask(task)
        assert.equal(taskSelect.children.length, 1)
        task.delete()
        assert.equal(taskSelect.children.length, 0)
    })
    
    it("Deleting Task Refreshes", () => {
        const task = new Task("bigenuff", 4, 4, "def", new Date())
        taskMgr.addTask(task)
        const spy = vi.spyOn(taskplan, "refresh")
        task.delete()
        expect(spy).toHaveBeenCalled()
    })
})