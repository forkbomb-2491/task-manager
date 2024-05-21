import { onLoad } from "./utils"

// const planner = document.getElementsByName("planner")[0]

export function addTask(title: string, dayId: string, completeCallback: (e: Event) => void) {
    const day = document.getElementById(dayId)
    var newElement = document.createElement("p")
    newElement.innerHTML = title
    
    var completeButton = document.createElement("button")
    completeButton.addEventListener("click", completeCallback)
    newElement.appendChild(completeButton)

    day?.appendChild(newElement)
}

onLoad(() => {

})