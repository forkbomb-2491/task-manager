import { invoke } from "@tauri-apps/api/core";

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
    try {
        await invoke("do_sync")
        return true
    } catch (e) {
        console.error(e)
        return false
    }
}

export async function sendMetadata(deviceId: string, previousVersion: string) {
    await invoke("send_telemetry", {
        deviceId: deviceId,
        previousVersion: previousVersion
    })
}