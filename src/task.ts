
export class Task {
    // id: string
    
    name: string
    bigness: string
    category: string
    due: Date
    completed: boolean

    deleted: boolean = false

    completeCallback: (() => void) | null = null
    deleteCallback: (() => void) | null = null

    private elements: Array<HTMLElement>

    constructor(name: string, bigness: string, category: string, due: Date, completed: boolean = false) {
        this.name = name
        this.bigness = bigness
        this.category = category
        
        this.due = due
        this.completed = completed

        this.elements = []
    }

    toBasicObject() {
        return {
            "name": this.name,
            "bigness": this.bigness,
            "category": this.category,
            "due": this.due,
            "completed": this.completed
        }
    }

    delete() {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            element.remove()
        }

        this.deleted = true

        if (this.deleteCallback != null) {
            this.deleteCallback()
        }
    }

    toggleCompleted() {
        if (!this.completed) {
            for (let i = 0; i < this.elements.length; i++) {
                const element = this.elements[i];
                element.className += " completed"
            }
        } else {
            for (let i = 0; i < this.elements.length; i++) {
                const element = this.elements[i];
                element.className = element.className.replace(" completed", "")
            }
        }

        this.completed = !this.completed

        if (this.completeCallback != null) {
            this.completeCallback()
        }
    }

    getTaskListElement() {
        var newElement = document.createElement("div")
        newElement.className = this.completed ? "task completed": "task"
        newElement.innerHTML = `
            <button class="complete"></button>
            <div style="width: 60%;">
                ${this.name}
            </div>
            <div style="width: 19%;">
                ${this.category}
            </div>
            <div style="width: 9%;">
                ${this.bigness}
            </div>
            <div style="width: 19%;">
                ${this.due}
            </div>
            <button style="background: none; border: 0;" class="deletetask">
                🗑️
            </button>
        `

        var deleteTaskCallback = (_: Event) => { this.delete() }
        var completeTaskCallback = (_: Event) => { this.toggleCompleted() }

        newElement.getElementsByClassName("complete")[0].addEventListener(
            "click",
            completeTaskCallback
        )

        newElement.getElementsByClassName("deletetask")[0].addEventListener(
            "click",
            deleteTaskCallback
        )

        this.elements.push(newElement)
        return newElement
    }

    getPlannerElement() {
        var newElement = document.createElement("p")
        if (this.completed) {
            newElement.className = " completed"
        }
        newElement.innerHTML = `
        <button class="complete"></button>
        ${this.name}
        `

        var completeTaskCallback = (_: Event) => { this.toggleCompleted() }

        newElement.getElementsByClassName("complete")[0].addEventListener(
            "click",
            completeTaskCallback
        )

        this.elements.push(newElement)
        return newElement
    }
}