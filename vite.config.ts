import { defineConfig } from "vite";
import { readdirSync } from "node:fs"
import path from "node:path";

const mobile = ["android", "ios"].indexOf(process.env.TAURI_ENV_PLATFORM!) != -1;

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
        },
        exclude: ["**/src/tests/**"]
    },
    esbuild: {
        supported: {
            "top-level-await": true
        }
    },
    test: {
        alias: {
            "./storage": path.resolve(__dirname, "./src/tests/mocks"),
            // "./settings": path.resolve(__dirname, "./src/tests/mocks"),
            "./notifications": path.resolve(__dirname, "./src/tests/mocks"),
        }
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        host: mobile ? true : false, 
        port: 1420,
        strictPort: true,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
