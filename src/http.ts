import { fetch } from "@tauri-apps/plugin-http";
import { Task, TaskRecord } from "./task";

// const API_URL = "https://api.forkbomb2491.dev"
const API_URL = "http://localhost:5000/"
var isAuthed: boolean | undefined

class HTTPError extends Error {
    readonly code: number

    constructor(code: number) {
        super()
        this.code = code
    }
}

export async function isAuthenticated(): Promise<boolean> {
    if (isAuthed != undefined) return isAuthed

    var response = await fetch(API_URL + "/login")
    return response.ok
}

export async function signIn(username: string, password: string): Promise<string> {
    const auth = "Basic " + btoa(username + ":" + password)
    const response = await fetch(API_URL + "/login", {
        headers: {
            "Authorization": auth
        }
    })
    if (response.ok) {
        const json = await response.json()
        return json.token
    } else {
        throw new HTTPError(response.status)
    }
}

export async function logInWithToken(token: string): Promise<boolean> {
    const response = await fetch(API_URL + "/login", {
        headers: {
            "Authorization": `token ${token}`
        }
    })
    return response.ok
}

export async function logOut(token: string) {
    await fetch(API_URL + "/logout", {
        method: "POST",
        body: JSON.stringify({"token": token}),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

export async function fetchTasks(): Promise<TaskRecord[]> {
    var resp = await fetch(API_URL + "/tasks")
    if (!resp.ok) {
        throw new HTTPError(resp.status)
    }

    return await resp.json()
}

export async function sendTasks(tasks: Task[]) {
    var toSend = tasks.filter(t => !t.deleted).map(t => t.record)
    await fetch(API_URL + "/tasks", {
        method: "POST",
        body: JSON.stringify(toSend),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

// type ServerList = {

// }