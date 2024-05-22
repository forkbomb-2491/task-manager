import { resolveResource } from '@tauri-apps/api/path'
import { readTextFile } from '@tauri-apps/api/fs'
import { setLastTheme } from './storage'

export async function changeTheme(theme: string) {
    const previousTheme = document.getElementById("themesheet")
    if (previousTheme != null) {
        document.head.removeChild(previousTheme)
    }

    if (theme != "light") {
        const themeFile = await resolveResource(`../src/themes/${theme}.css`)
        const themeCode = await readTextFile(themeFile) 

        var newTheme = document.createElement("style")
        newTheme.id = "themesheet"
        newTheme.innerHTML = themeCode
        document.head.appendChild(newTheme)
    }

    await setLastTheme(theme)
}

export function createTaskElement(title: string, cat: string, bigness: string, due: string) {
    var newTask = document.createElement("div")
    newTask.className = "task"
    newTask.innerHTML = `
        <button class="completed"></button>
        <div style="width: 50%;">
            ${title}
        </div>
        <div style="width: 19%;">
            ${cat}
        </div>
        <div style="width: 19%;">
            ${bigness}
        </div>
        <div style="width: 19%;">
            ${due}
        </div>
        <button style="background: none; border: 0;" class="deletetask">
            🗑️
        </button>
    `
    return newTask
}