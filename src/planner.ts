import { onLoad } from "./utils"

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

onLoad(() => {

})