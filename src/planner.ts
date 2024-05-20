import { onLoad } from "./utils"

// const planner = document.getElementsByName("planner")[0]

export function addTask(title: string, dayId: string) {
    const day = document.getElementById(dayId)
    var newElement = document.createElement("p")
    newElement.innerHTML = title
    day?.appendChild(newElement)
}

onLoad(() => {

})