import { DomMarkerBase, type DomMarkerOptions } from './base/DomMarkerBase'
import type { VisualizationHost } from '../../types'
import { MarkerAssets } from './assets'

export interface PanelMarkerOptions extends DomMarkerOptions {
    title?: string
    expanded?: boolean
    markerText?: string
    markerImage?: string
    theme?: 'panel' | 'sample' | 'hud'
    color?: string
    onExpandedChange?: (expanded: boolean) => void
}

/** 可折叠的地理面板；收起内容后仍保留标记按钮。 */
export class PanelMarker extends DomMarkerBase {
    private readonly panel: HTMLDivElement
    private readonly toggle: HTMLButtonElement
    private readonly onExpandedChange?: (expanded: boolean) => void

    constructor(host: VisualizationHost, options: PanelMarkerOptions) {
        super(host, options)
        this.element.classList.add('geoearth-panel-marker', `geoearth-panel-marker--${options.theme ?? 'sample'}`)
        if (options.color) this.element.style.setProperty('--geoearth-accent', options.color)
        this.onExpandedChange = options.onExpandedChange
        const doc = this.element.ownerDocument
        const panel = doc.createElement('div')
        panel.className = 'geoearth-popup'
        const header = doc.createElement('header')
        const title = doc.createElement('strong')
        title.textContent = options.title ?? ''
        header.append(title)
        const close = doc.createElement('button')
        close.type = 'button'
        close.textContent = '×'
        close.setAttribute('aria-label', '收起面板')
        header.append(close)
        this.contentElement.style.padding = '12px'
        panel.append(header, this.contentElement)
        const pedestal = doc.createElement('div')
        pedestal.className = 'geoearth-panel-pedestal'
        panel.append(pedestal)
        const toggle = doc.createElement('button')
        toggle.type = 'button'
        toggle.textContent = options.markerText ?? ''
        toggle.className = 'geoearth-panel-toggle'
        toggle.style.backgroundImage = `url("${options.markerImage ?? MarkerAssets.panelPoint}")`
        toggle.setAttribute('aria-label', '展开或收起面板')
        this.element.append(panel, toggle)
        this.panel = panel
        this.toggle = toggle
        const togglePanel = () => this.setExpanded(panel.hidden === true)
        const closePanel = () => this.setExpanded(false)
        toggle.addEventListener('click', togglePanel)
        close.addEventListener('click', closePanel)
        this.own(() => {
            toggle.removeEventListener('click', togglePanel)
            close.removeEventListener('click', closePanel)
        })
        this.setExpanded(options.expanded ?? true)
    }

    setExpanded(expanded: boolean): void {
        this.assertAlive()
        const changed = this.toggle.getAttribute('aria-expanded') !== String(expanded)
        this.panel.hidden = !expanded
        this.toggle.setAttribute('aria-expanded', String(expanded))
        if (changed) this.onExpandedChange?.(expanded)
        this.requestRender()
    }

    get expanded(): boolean { return !this.panel.hidden }
}
