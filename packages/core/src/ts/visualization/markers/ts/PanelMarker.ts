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

/** 可折叠的地理面板；锚点定位标记按钮，展开内容不改变按钮的位置。 */
export class PanelMarker extends DomMarkerBase {
    private readonly board: HTMLDivElement
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
        // 面板和底座整体向上展开，底座位于面板外部，按钮始终留在地理锚点。
        const board = doc.createElement('div')
        board.className = 'geoearth-panel-board'
        board.append(panel, pedestal)
        const toggle = doc.createElement('button')
        toggle.type = 'button'
        toggle.textContent = options.markerText ?? ''
        toggle.className = 'geoearth-panel-toggle'
        toggle.style.backgroundImage = `url("${options.markerImage ?? MarkerAssets.panelPoint}")`
        toggle.setAttribute('aria-label', '展开或收起面板')
        this.element.append(board, toggle)
        this.board = board
        this.toggle = toggle
        const togglePanel = () => this.setExpanded(board.hidden === true)
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
        this.board.hidden = !expanded
        this.toggle.setAttribute('aria-expanded', String(expanded))
        if (changed) this.onExpandedChange?.(expanded)
        this.requestRender()
    }

    get expanded(): boolean { return !this.board.hidden }
}
