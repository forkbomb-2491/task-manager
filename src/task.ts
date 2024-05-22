

export class Task {
    // id: string
    
    name: string
    bigness: number
    category: string
    due: string

    private elements: Array<HTMLElement>

    constructor(name: string, bigness: number, category: string, due: string) {
        this.name = name
        this.bigness = bigness
        this.category = category
        
        this.due = due

        this.elements = []
    }

    private getBignessString() {
        switch (this.bigness) {
            case 1:
                return "Not Big"
                break;
    
            case 2:
                return "A Little Big"
                break;
    
            case 3:
                return "Medium Big"
                break;
                
            case 4:
                return "Pretty Big"
                break;
    
            case 5:
                return "Very Big"
                break;
        
            default:
                break;
        }
    }

    delete() {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            element.remove()
        }

        this.elements = []
    }

    getTaskListElement() {
        var newElement = document.createElement("div")
        newElement.className = "task"
        newElement.innerHTML = `
            <button class="completed"></button>
            <div style="width: 50%;">
                ${this.name}
            </div>
            <div style="width: 19%;">
                ${this.category}
            </div>
            <div style="width: 19%;">
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

        newElement.getElementsByClassName("completed")[0].addEventListener(
            "click",
            deleteTaskCallback
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
        newElement.innerHTML = `
        <button class="completed"></button>
        ${this.name}
        `

        var deleteTaskCallback = (_: Event) => { this.delete() }

        newElement.getElementsByClassName("completed")[0].addEventListener(
            "click",
            deleteTaskCallback
        )

        this.elements.push(newElement)
        return newElement
    }
}