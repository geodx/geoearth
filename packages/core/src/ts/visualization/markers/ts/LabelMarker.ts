import { DomMarkerBase, type DomMarkerOptions } from './base/DomMarkerBase'
import type { VisualizationHost } from '../../types'

export type LabelTheme = 'simple' | 'gradient' | 'erect' | 'hotspot' | 'floating' | 'dynamic' | 'led' | 'frame'

export interface LabelMarkerOptions extends Omit<DomMarkerOptions, 'content'> {
    text?: string
    content?: HTMLElement | string
    title?: string
    color?: string
    theme?: LabelTheme
}

/** 显示文字或富内容标牌，通过主题设置外观和动画效果。 */
export class LabelMarker extends DomMarkerBase {
    constructor(host: VisualizationHost, options: LabelMarkerOptions) {
        super(host, { ...options, content: options.content ?? options.text ?? '' })
        const doc = this.element.ownerDocument
        const theme = options.theme ?? 'simple'
        const frame = doc.createElement('div')
        frame.className = `geoearth-label geoearth-label--${theme}`
        if (options.color) frame.style.setProperty('--geoearth-accent', options.color)
        if (options.title) {
            const title = doc.createElement('strong')
            title.textContent = options.title
            frame.append(title)
        }
        frame.append(this.contentElement)
        if (['gradient', 'erect', 'hotspot'].includes(theme)) {
            const stem = doc.createElement('div')
            stem.className = 'geoearth-marker-stem'
            frame.append(stem)
        }
        if (theme === 'hotspot') {
            const foot = doc.createElement('div')
            foot.className = 'geoearth-hotspot-foot'
            frame.append(foot)
        }
        this.element.append(frame)
    }

    setText(text: string): void { this.setContent(text) }
}
