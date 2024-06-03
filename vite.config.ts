import { defineConfig } from "vite";
import { readdirSync } from "node:fs"

function getRollupInputs(): string[] {
    // Always include index
    var inputs = ["index.html"]

    // // Bundle themes
    // var themes = readdirSync("src/styles/themes")
    // themes.forEach((file) => {
    //     inputs.push(`src/styles/themes/${file}`)
    // })

    // Bundle tabs
    var themes = readdirSync("src/tabs")
    themes.forEach((file) => {
        inputs.push(`src/tabs/${file}`)
    })

    return inputs
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    build: {
        rollupOptions: {
            input: getRollupInputs()
        }
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
