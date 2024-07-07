// @vitest-environment jsdom
import { assert, beforeEach, describe, it } from "vitest";
import { Task, TaskEvent, TaskEventType, onTaskAdd, onTaskAdopt, onTaskComplete, onTaskDelete, onTaskEdit, onTaskUncomplete } from "../task";
import { TaskManager } from "../taskmanager";
// @ts-ignore
import { mockDoc, getTask, clearEvents } from './testutils'
mockDoc()
var task: Task
beforeEach(() => {
    clearEvents()
    task = getTask()
})

describe("Task Events", () => {
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

    it("Task Adoption Event", () => {
        var eventReceived: TaskEvent | undefined
        onTaskAdopt(e => eventReceived = e)
        var child = new Task("test", 1, 1, "hhhh", new Date())
        task.adoptChild(child)

        assert.notEqual(eventReceived, undefined)
    })

    it("Deleting Parent Deletes Child", () => {
        var child = getTask()
        task.adoptChild(child)
        task.delete()
        
        assert.isTrue(child.deleted)
    })
})

describe("Task Event Funcs", () => {
    it("Task Delete Fires and Catches", () => {
        var event: TaskEvent | undefined
        onTaskDelete(e => event = e)
        window.dispatchEvent(new TaskEvent(TaskEventType.delete, task))
        assert.notEqual(event, undefined)
        assert.equal(event!.task.id, task.id)
    })

    it("Task Edit Fires and Catches", () => {
        var event: TaskEvent | undefined
        onTaskEdit(e => event = e)
        window.dispatchEvent(new TaskEvent(TaskEventType.edit, task))
        assert.notEqual(event, undefined)
        assert.equal(event!.task.id, task.id)
    })

    it("Task Complete Fires and Catches", () => {
        var event: TaskEvent | undefined
        onTaskComplete(e => event = e)
        window.dispatchEvent(new TaskEvent(TaskEventType.complete, task))
        assert.notEqual(event, undefined)
        assert.equal(event!.task.id, task.id)
    })

    it("Task Uncomplete Fires and Catches", () => {
        var event: TaskEvent | undefined
        onTaskUncomplete(e => event = e)
        window.dispatchEvent(new TaskEvent(TaskEventType.uncomplete, task))
        assert.notEqual(event, undefined)
        assert.equal(event!.task.id, task.id)
    })

    it("Task Add Fires and Catches", () => {
        var event: TaskEvent | undefined
        onTaskAdd(e => event = e)
        window.dispatchEvent(new TaskEvent(TaskEventType.add, task))
        assert.notEqual(event, undefined)
        assert.equal(event!.task.id, task.id)
    })

    it("Task Adopt Fires and Catches", () => {
        var event: TaskEvent | undefined
        onTaskAdopt(e => event = e)
        window.dispatchEvent(new TaskEvent(TaskEventType.adopt, task))
        assert.notEqual(event, undefined)
        assert.equal(event!.task.id, task.id)
    })
})

describe("Task Manager Tests", () => {
    var taskMgr = new TaskManager()

    it("Add Task Works", () => {
        taskMgr.addTask(new Task("test", 1, 2, "red", new Date()))
        assert.notEqual(taskMgr.tasks.length, 0)
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