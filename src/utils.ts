import { getCurrent } from "@tauri-apps/api/window"
import { sendNotification } from "@tauri-apps/plugin-notification"

/**
 * Registers the given closure/function as an event listener for 
 * "DOMContentLoaded", thus running it only once all content has loaded.
 * @param {} closure 
 */
export function onLoad(closure: () => void) {
    window.addEventListener(
        "DOMContentLoaded", closure
    )
}

export function onTasksChanged(closure: () => void) {
    window.addEventListener(
        "taskchanged", closure
    )
}

export function sendNotif(title: string, body: string) {
    getCurrent().isFocused().then(
        isFocused => {
            if (isFocused) {
                inAppNotif(title, body)
            } else {
                sendNotification({
                    title: title,
                    body: body
                })
            }
        }
    )
}

/** !!!!! LOCAL LOCAL LOCAL !!!!!! */
export function todayDateString() {
    var date = new Date()
    return date.toDateString()
}

export function padWithLeftZeroes(numString: string, numDigits: number) {
    var ret = numString
    while (ret.length < numDigits) {
        ret = "0" + ret
    }
    return ret
}

export function getTimeString(time: number) {
    var hours = Math.floor(time / 3600)
    var mins = Math.floor(time / 60 - hours * 60)
    var secs = Math.floor(time - mins * 60 - hours * 3600)

    var ret = ""
    if (hours > 0) {
        ret += `${hours}:`
    }
    
    ret += padWithLeftZeroes(`${mins}`, 2) + ":"
    ret += padWithLeftZeroes(`${secs}`, 2)

    return ret
}

export function findFirstPrecedingDay(date: Date, day: Weekdays) {
    var ret = new Date(date.valueOf())
    while (ret.getDay() != day) {
        ret = new Date(ret.valueOf() - 86_400_000)
    }

    return ret
}

export function getFirstSelected(select: HTMLSelectElement): HTMLOptionElement | null {
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i]
        if (option.selected) {
            return option
        }
    }

    return null
}

export function onWindowFocused(cb: () => void) {
    window.addEventListener(
        "focus",
        _ => cb()
    )
}

export const isSameDay = (d1: Date, d2: Date) => {
    return (d1.getFullYear() == d2.getFullYear() &&
    d1.getMonth() == d2.getMonth() &&
    d1.getDate() == d2.getDate())
}

var tooltip: HTMLDivElement = document.createElement("div")
var ttMoveOnCooldown: boolean = false
tooltip.style.display = "none"
tooltip.style.position = "fixed"
tooltip.className = "tooltip"
document.body.appendChild(tooltip)

window.addEventListener(
    "mousemove",
    e => {
        if (tooltip.style.display == "none" || ttMoveOnCooldown) return
        if (e.x < window.innerWidth/2) {
            tooltip.style.right = `${e.x + 10}px`
        } else {
            tooltip.style.right = `${10 + (window.innerWidth - e.x)}px`
        }
        tooltip.style.top = `${e.y + 10}px`
    }
)

export function showTooltip(text: string) {
    tooltip.innerHTML = text
    tooltip.style.display = "block"
}

export function hideTooltip() {
    tooltip.style.display = "none"
}

export function showTooltipOnHover(element: HTMLElement, text: string) {
    element.addEventListener(
        "mouseenter",
        () => showTooltip(text)
    )

    element.addEventListener(
        "mouseleave",
        () => hideTooltip()
    )
}

export function toHTMLDateTimeString(date: Date) {
    var ret = String(date.getFullYear())
    ret += "-" + padWithLeftZeroes(String(date.getMonth() + 1), 2)
    ret += "-" + padWithLeftZeroes(String(date.getDate()), 2)
    ret += " " + padWithLeftZeroes(String(date.getHours()), 2)
    ret += ":" + padWithLeftZeroes(String(date.getMinutes()), 2)
    return ret
}

export function registerShowHideButton(buttonId: string, targetId: string, display: string = "block") {
    const button = document.getElementById(buttonId)!
    const target = document.getElementById(targetId)!
    button.className = "showhidebutton"
    button.addEventListener(
        "click",
        _ => {
            if (button.className.includes("folded")) {
                button.className = "showhidebutton"
                target.style.display = display
            } else {
                button.className = "showhidebutton folded"
                target.style.display = "none"
            }
        }
    )
}

export function showSheet(heading: string, contentHTML: string) {
    document.getElementById("sheetheading")!.innerText = heading
    document.getElementById("sheetcontent")!.innerHTML = contentHTML
    const sheet = document.getElementById("sheet")!
    sheet.style.animation = "sheetfade 150ms reverse"
    sheet.style.display = "initial"
    window.setTimeout(() => {
        sheet.style.animation = "none"
    }, 140)
}

export function inAppNotif(title: string, body: string, timeout: number = 3000) {
    var html = `
    <div class="container">
        <b style="width: 100%; text-align: center">${title}</b>
        ${body}
    </div>`
    const notif = document.createElement("div")
    notif.className = "notif falling"
    notif.innerHTML = html
    document.body.appendChild(notif)
    setTimeout(() => {
        notif.className = "notif retracting"
        setTimeout(() => notif.remove(), 900)
    }, timeout)
}

export function getElement(id: string) {
    return document.getElementById(id)!
}

/**
 * An enum for the daycolumns' IDs in the HTML.
 */
export enum DayCols {
    "suncol",
    "moncol",
    "tuecol",
    "wedcol",
    "thucol",
    "fricol",
    "satcol"
}

export enum Weekdays {
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
}

export const WEEKDAY_STRINGS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
]

export enum Months {
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
}

export enum SortBasis {
    "name",
    "category",
    "size",
    "importance",
    "duedate"
}