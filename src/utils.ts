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

export enum DayCols {
    "suncol",
    "moncol",
    "tuecol",
    "wedcol",
    "thucol",
    "fricol",
    "satcol"
}