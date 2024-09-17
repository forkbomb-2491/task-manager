import { invoke } from "@tauri-apps/api/core";
import { getElement } from "./utils";

var isAuthed: boolean = await invoke("is_logged_in")

export function isAuthenticated(): boolean {
    return isAuthed
}

export async function signIn(username: string, password: string) {
    await invoke("log_in", {username: username, password: password})
    
}

export async function logOut() {
    await invoke("log_out")
}

export async function doSync(): Promise<boolean> {
    if (!isAuthed) { return false; }
    getElement("syncdebuginfo").innerHTML = ""
    try {
        await invoke("do_sync")
        getElement("syncdebuginfo").style.color = "green"
        getElement("syncdebuginfo").innerHTML = "✅ Success!"
        return true
    } catch (e) {
        console.error(e)
        getElement("syncdebuginfo").style.color = "red"
        getElement("syncdebuginfo").innerHTML = `⚠️ ${e}`
        return false
    }
}

export async function sendMetadata(deviceId: string, previousVersion: string) {
    await invoke("send_telemetry", {
        deviceId: deviceId,
        previousVersion: previousVersion
    })
}