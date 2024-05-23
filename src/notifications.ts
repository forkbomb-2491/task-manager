import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/api/notification";

export async function sendNotif(title: string, body: string) {
    if (!(await isPermissionGranted())) {
        await requestPermission()
    }

    sendNotification({
        title: title,
        body: body
    })
}