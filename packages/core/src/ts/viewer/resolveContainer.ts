export function resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container !== 'string') {
        return container
    }

    const element = document.getElementById(container)

    if (!element) {
        throw new Error(`[GeoEarth] container not found: ${container}`)
    }

    return element
}

export function prepareContainer(container: HTMLElement) {
    if (!container.style.position) {
        container.style.position = 'relative'
    }

    if (!container.style.width) {
        container.style.width = '100%'
    }

    if (!container.style.height) {
        container.style.height = '100%'
    }
}


