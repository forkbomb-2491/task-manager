import { getElement } from "./utils"


export class UpdateControl extends Event {
    private _id: string

    get id(): string { return this._id }

    constructor(id: string) {
        super(`control/update/${id}`)
        this._id = id
    }
}

export function updateControl(id: string) {
    window.dispatchEvent(new UpdateControl(id))
}


// Checkbox (NOT radio)

export function addCheckboxControl(
    id: string, 
    getter: () => Promise<boolean>, 
    setter: (arg0: boolean) => Promise<void>,
    updateOnEvent: boolean = false
) {
    // @ts-ignore
    const element: HTMLInputElement = getElement(id)
    
    getter().then(res => element.checked = res)
    element.addEventListener("change", async e => {
        if (e.isTrusted) {
            await setter(element.checked)
        }
    })

    if (updateOnEvent) {
        window.addEventListener(`control/update/${id}`, async _ => {
            element.checked = await getter()
        })
    }
}


// Range/Slider

export function addRangeControl(
    id: string, 
    getter: () => Promise<number>, 
    setter: (arg0: number) => Promise<void>,
    updateOnEvent: boolean = false
) {
    // @ts-ignore
    const element: HTMLInputElement = getElement(id)
    
    getter().then(res => element.valueAsNumber = res)
    element.addEventListener("change", async e => {
        if (e.isTrusted) {
            await setter(element.valueAsNumber)
        }
    })

    if (updateOnEvent) {
        window.addEventListener(`control/update/${id}`, async _ => {
            element.valueAsNumber = await getter()
        })
    }
}

export const addSliderControl = addRangeControl


// Radio button form

export function addRadioControl(
    id: string, 
    getter: () => Promise<number>, 
    setter: (arg0: number) => Promise<void>,
    updateOnEvent: boolean = false
) {
    // @ts-ignore
    const element: HTMLFormElement = getElement(id)
    
    getter().then(res => {
        for (const input of element.getElementsByTagName("input")) {
            if (input.valueAsNumber == res) {
                input.checked = true
                break
            }
        }
    })

    element.addEventListener("change", async e => {
        if (e.isTrusted) {
            for (const input of element.getElementsByTagName("input")) {
                if (input.checked) {
                    await setter(element.valueAsNumber)
                    break
                }
            }
        }
    })

    if (updateOnEvent) {
        window.addEventListener(`control/update/${id}`, async _ => {
            element.valueAsNumber = await getter()
        })
    }
}


// Entry

export function addEntryControl(
    id: string, 
    getter: () => Promise<string>, 
    setter: (arg0: string) => Promise<void>,
    updateOnEvent: boolean = false
) {
    // @ts-ignore
    const element: HTMLInputElement = getElement(id)
    
    getter().then(res => element.value = res)
    element.addEventListener("change", async e => {
        if (e.isTrusted) {
            await setter(element.value)
        }
    })

    if (updateOnEvent) {
        window.addEventListener(`control/update/${id}`, async _ => {
            element.value = await getter()
        })
    }
}