

export function changeTheme(theme: string) {
    var themeElement = document.getElementById("themesheet")
    if (themeElement != null) {
        document.head.removeChild(themeElement)
    }
    if (theme == "light") { return; }

    var newTheme = document.createElement("link")
    newTheme.rel = "stylesheet"
    newTheme.href = `/src/themes/${theme}.css`
    newTheme.id = "themesheet"
    document.head.appendChild(newTheme)
}

