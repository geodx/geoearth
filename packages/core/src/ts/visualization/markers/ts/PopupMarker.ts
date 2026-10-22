import { DomMarkerBase, type DomMarkerOptions } from './base/DomMarkerBase'
import type { VisualizationHost } from '../../types'

export interface PopupMarkerOptions extends DomMarkerOptions {
    title?: string
    closable?: boolean
    theme?: 'panel' | 'hud' | 'angular'
    color?: string
    onClose?: () => void
}

export class PopupMarker extends DomMarkerBase {

    constructor(host: VisualizationHost, options: PopupMarkerOptions) {
        super(host, options)
        this.element.classList.add('geoearth-popup', `geoearth-popup--${options.theme ?? 'panel'}`)
        if (options.color) this.element.style.setProperty('--geoearth-accent', options.color)
        const doc = this.element.ownerDocument
        const header = doc.createElement('header')
        const title = doc.createElement('strong')
        title.textContent = options.title ?? ''
        header.append(title)
        if (options.closable !== false) {
            const close = doc.createElement('button')
            close.type = 'button'
            close.textContent = '×'
            close.setAttribute('aria-label', '关闭弹窗')
            const onClose = () => {
                this.show = false
                options.onClose?.()
            }
            close.addEventListener('click', onClose)
            this.own(() => close.removeEventListener('click', onClose))
            header.append(close)
        }
        this.element.prepend(header)
        this.contentElement.style.padding = '12px'
    }
}
