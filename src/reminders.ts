import { TaskNotifier } from './notifications'
import { Task } from "./task";

export class RemindersContainer {

    private taskNotifier: TaskNotifier
    private tasks: Task[] = []
    private elements: HTMLElement[] = []


    constructor (taskNotifier: TaskNotifier){
        this.taskNotifier = taskNotifier

    }

    render(): void {
        this.tasks = this.taskNotifier.getNotifTasks()
        this.cleanUpElements()

        var reminderList = document.getElementById("reminderlist")!
        reminderList.innerHTML = ""
        console.log("render3")
        
        this.tasks.forEach(task => reminderList.appendChild(this.getReminderElement(task)));        
        console.log("render4")

    }

    private cleanUpElements() {
        var newElements = []
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (element.parentElement == null) {
                element.remove()
                continue
            }
            
            newElements.push(element)
        }
        this.elements = newElements
    }

    getReminderElement(task: Task) {
        var newElement = document.createElement("div")
        newElement.className = "task"
        console.log("render5")

        newElement.innerHTML = `
            <div style="width: 100%;">
                Checked in on ${task.name}
            </div>
        `
        this.elements.push(newElement)
        console.log("render6")

        return newElement
    }
}