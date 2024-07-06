// @vitest-environment jsdom
import { assert, beforeEach, describe, expect, it, vi } from "vitest";
import { Task, TaskEvent, TaskManager, onTaskComplete, onTaskDelete, onTaskUncomplete } from "../task";
// @ts-ignore
import { mockDoc, getTask } from './testutils'
mockDoc()

describe("Task Events", () => {
    var task = new Task("test", 1, 1, "hhhh", new Date())

    it("Task Complete Event", () => {
        var eventReceived: TaskEvent | undefined
        onTaskComplete((e) => eventReceived = e)
        task.toggleCompleted()
    
        assert.notEqual(eventReceived, undefined)
        assert.equal(eventReceived!.task.completed, task.completed)
        assert.isTrue(task.completed)
    })

    it("Task Uncomplete Event", () => {
        var eventReceived: TaskEvent | undefined
        onTaskUncomplete((e) => eventReceived = e)
        task.toggleCompleted()
    
        assert.notEqual(eventReceived, undefined)
        assert.equal(eventReceived!.task.completed, task.completed)
        assert.isFalse(task.completed)
    })

    it("Task Delete Event", () => {
        var eventReceived: TaskEvent | undefined
        onTaskDelete((e) => eventReceived = e)
        task.delete()

        assert.notEqual(eventReceived, undefined)
        assert.isTrue(task.deleted)
    })

    it("Task Adoption works", () => {
        var child = new Task("test", 1, 1, "hhhh", new Date())
        task.adoptChild(child)

        assert.equal(child.parent, task)
        assert.isTrue(task.subtasks.includes(child))
    })

    it("Deleting Parent Deletes Child", () => {
        var child = task.subtasks[0]
        task.delete()
        
        assert.isTrue(child.deleted)
    })
})

describe("Task Manager Tests", () => {
    var taskMgr = new TaskManager()

    it("Add Task Works", () => {
        taskMgr.addTask(new Task("test", 1, 2, "red", new Date()))
        assert.notEqual(taskMgr.tasks.length, 0)
    })
    
    it("Refresh on Task Change", () => {
        taskMgr.addTask(new Task("test", 1, 2, "red", new Date()))
        const spy = vi.spyOn(taskMgr, "refresh")
        taskMgr.tasks[0].toggleCompleted()
        expect(spy).toHaveBeenCalled()
    })
})

describe("Task Tab Tests", () => {
    var taskMgr = new TaskManager()
    beforeEach(() => {
        mockDoc()
        currentList = document.getElementById("currenttasklist")!
        completedList = document.getElementById("completedtasklist")!
        taskMgr = new TaskManager()
    })

    var currentList = document.getElementById("currenttasklist")!
    var completedList = document.getElementById("completedtasklist")!

    it("Task Added to Task List", () => {
        taskMgr.addTask(new Task("test", 1, 2, "red", new Date()))
        assert.strictEqual(currentList.children.length, 1)
    })
    
    it("Completion Removes from List", () => {
        const task = getTask()
        taskMgr.addTask(task)
        assert.strictEqual(currentList.children.length, 1)
        task.toggleCompleted()
        assert.strictEqual(currentList.children.length, 0)
        assert.strictEqual(completedList.children.length, 1)
    })

    it("Deletion Removes from List", () => {
        taskMgr.addTask(new Task("test", 1, 2, "red", new Date()))
        assert.strictEqual(currentList.children.length, 1)
        taskMgr.tasks[0].delete()
        assert.strictEqual(currentList.children.length, 0)
    })
})