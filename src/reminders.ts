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
        
        this.tasks.forEach(task => reminderList.appendChild(this.getReminderElement(task)));        

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

        if (task.dueIn < 0) {
            newElement.innerHTML = `
            <div style="width: 100%;">
                Checked in on ${task.name}! </br>
                Have you made any progress on ${task.name}? It was due ${(task.dueIn*(-1))-1} day(s) ago!
            </div>
        `
        } else if (task.dueIn == 0) {
            newElement.innerHTML = `
            <div style="width: 100%;">
                Checked in on ${task.name}! </br>
                Have you made any progress on ${task.name}? It's due today!
            </div>
        `
        }
        else {
            newElement.innerHTML = `
            <div style="width: 100%;">
                Checked in on ${task.name}! </br>
                Have you made any progress on ${task.name}? You have ${task.dueIn} day(s) until it's due!
            </div>
        `
        }
        


        
        this.elements.push(newElement)

        return newElement
    }
}