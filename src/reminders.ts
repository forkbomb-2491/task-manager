import { TaskNotifier } from './notifications'
import { Task, TaskView } from "./task";

class RemindersContainer {

    private taskNotifier: TaskNotifier
    private tasks: Task[]

    constructor (taskNotifier: TaskNotifier){
        this.taskNotifier = taskNotifier
        this.tasks = this.taskNotifier.getTasks()

    }

    render(): void {
        var reminderList = document.getElementById("reminderlist")!
        
        // this.tasks.forEach(task => reminderList.appendChild(poop));
        
    }
}