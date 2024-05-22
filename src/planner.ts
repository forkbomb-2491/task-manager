import { onLoad } from "./utils"
import { savePlannerFlip } from "./storage"

// const planner = document.getElementsByName("planner")[0]

export function addPlannerTask(task: HTMLElement, dayId: string) {
    const day = document.getElementById(dayId)
    day?.appendChild(task)
}

export function createPlannerTaskElement(title: string) {
    var newElement = document.createElement("p")
    newElement.innerHTML = `
    <button class="completed"></button>
    ${title}
    `

    return newElement
}

export function switchPlannerOrientation() {
    var previousElement = document.getElementById("plannervertical")
    if (previousElement != null) {
        previousElement.remove()
        savePlannerFlip(false)
        return
    }
    var newElement = document.createElement("style")
    newElement.id = "plannervertical"
    newElement.innerHTML = `
    .plannercontainer {
        flex-direction: column;
    }
    
    .daycolumn {
        flex-grow: 1;
        width: unset;
        min-height: unset;
        margin-bottom: 1.25rem;
    
        column-count: 2;
    }
    
    .daycolumn h4 {
        text-align: left;
    }`
    savePlannerFlip(true)
    document.head.appendChild(newElement)
}

onLoad(() => {

})