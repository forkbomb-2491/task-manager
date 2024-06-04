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
/** !!!!! LOCAL LOCAL LOCAL !!!!!! */
export function todayDateString() {
    var date = new Date()
    return date.toDateString()
    // return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function padWithLeftZeroes(numString: string, numDigits: number) {
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