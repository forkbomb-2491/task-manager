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

describe("Task Time Tests", () => {
    it("Date Correct from Midnight", () => {
        var testDate = new Date(2024, 0, 1, 0, 0)
        var task = new Task("test", 1, 1, "", testDate)
        assert.strictEqual(task._due.getFullYear(), testDate.getFullYear())
        assert.strictEqual(task._due.getMonth(), testDate.getMonth())
        assert.strictEqual(task._due.getDate(), testDate.getDate())
    })

    it("Date Correct from 23:59", () => {
        var testDate = new Date(2024, 0, 1, 23, 59)
        var task = new Task("test", 1, 1, "", testDate)
        assert.strictEqual(task._due.getFullYear(), testDate.getFullYear())
        assert.strictEqual(task._due.getMonth(), testDate.getMonth())
        assert.strictEqual(task._due.getDate(), testDate.getDate())
    })
    
    it("Timestamp to Date Works Midnight", () => {
        var testDate = new Date(2024, 0, 1, 0, 0)
        var tsDate = new Date(testDate.valueOf())
        var task = new Task("test", 1, 1, "", tsDate)
        assert.strictEqual(task._due.getFullYear(), testDate.getFullYear())
        assert.strictEqual(task._due.getMonth(), testDate.getMonth())
        assert.strictEqual(task._due.getDate(), testDate.getDate())
    })
    
    it("Timestamp to Date Works 23:59", () => {
        var testDate = new Date(2024, 0, 1, 23, 59)
        var tsDate = new Date(testDate.valueOf())
        var task = new Task("test", 1, 1, "", tsDate)
        assert.strictEqual(task._due.getFullYear(), testDate.getFullYear())
        assert.strictEqual(task._due.getMonth(), testDate.getMonth())
        assert.strictEqual(task._due.getDate(), testDate.getDate())
    })
    
    it("Date and Time Midnight", () => {
        var testDate = new Date(2024, 0, 1, 0, 0)
        var task = new Task("test", 1, 1, "", testDate)
        assert.strictEqual(task._due.getFullYear(), testDate.getFullYear())
        assert.strictEqual(task._due.getMonth(), testDate.getMonth())
        assert.strictEqual(task._due.getDate(), testDate.getDate())
        assert.strictEqual(task._due.getHours(), testDate.getHours())
        assert.strictEqual(task._due.getMinutes(), testDate.getMinutes())
    })
    
    it("Date and Time Midnight from Record", () => {
        var testDate = new Date(2024, 0, 1, 0, 0)
        var taskRecord = new Task("test", 1, 1, "", testDate).record
        var task = new Task(taskRecord.name, taskRecord.size, taskRecord.importance, taskRecord.category, taskRecord.due)
        assert.strictEqual(task._due.getFullYear(), testDate.getFullYear())
        assert.strictEqual(task._due.getMonth(), testDate.getMonth())
        assert.strictEqual(task._due.getDate(), testDate.getDate())
        assert.strictEqual(task._due.getHours(), testDate.getHours())
        assert.strictEqual(task._due.getMinutes(), testDate.getMinutes())
    })
})

describe("Task Edits", () => {
    var taskMgr: TaskManager
    beforeEach(() => {
        task = getTask(1, 1)
        taskMgr = new TaskManager()
        // @ts-ignore 2341
        taskMgr.render()
        taskMgr.addTask(task)
    })

    it("Task List Update on Task Edit", () => {
        // @ts-ignore 2341
        var elements = task.elements
        const taskListHTML = elements.filter(e => e.className == "taskcontainer")[0].innerHTML
        task.name += " testedit"
        // @ts-ignore 2341
        var elements = task.elements
        assert.notEqual(taskListHTML, elements.filter(e => e.className == "taskcontainer")[0].innerHTML)
    })
    
    it("Task Plan/Help Update on Task Edit", () => {
        // @ts-ignore 2341
        var elements = task.elements
        const elementHTML = elements.filter(e => e.className == "task")[0].innerHTML
        task.name += " testedit"
        // @ts-ignore 2341
        var elements = task.elements
        assert.notEqual(elementHTML, elements.filter(e => e.className == "task")[0].innerHTML)
    })
    
    it("Planner Update on Task Edit", () => {
        // @ts-ignore 2341
        var elements = task.elements
        const elementHTML = elements.filter(e => e.tagName == "P")[0].innerHTML
        task.name += " testedit"
        // @ts-ignore 2341
        var elements = task.elements
        assert.notEqual(elementHTML, elements.filter(e => e.tagName == "P")[0].innerHTML)
    })
})