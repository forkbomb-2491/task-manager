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