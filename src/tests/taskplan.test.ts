// @vitest-environment jsdom
import { assert, beforeEach, describe, it, vi } from 'vitest'
import { mockDoc } from './testutils'
import { Task, TaskManager } from '../task'
import { TaskPlanner } from '../taskplan'

var taskMgr: TaskManager
var taskplan: TaskPlanner

beforeEach(() => {
    mockDoc()
    taskMgr = new TaskManager()
    // @ts-ignore
    taskplan = taskMgr.taskplan
})

describe("TaskPlan Task Changes", () => {
    it("Adding Task Adds to TaskPlan List", () => {
        const task = new Task("bigenuff", 4, 4, "def", new Date())
        var taskSelect = document.getElementById("tptask")!
        assert.equal(taskSelect.children.length, 0)
        taskMgr.addTask(task)
        assert.equal(taskSelect.children.length, 1)
    })
})