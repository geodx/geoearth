import { DomMarkerBase, type DomMarkerOptions } from './base/DomMarkerBase'
import type { VisualizationHost } from '../../types'

export interface LiquidFillMarkerOptions extends Omit<DomMarkerOptions, 'content'> {
    /** 比例值，范围为 [0, 1]。 */
    value: number
    color?: string
}

/** 用 CSS 实现水球比例效果，不向主包引入 ECharts。 */
export class LiquidFillMarker extends DomMarkerBase {
    private readonly water: HTMLDivElement
    private readonly caption: HTMLSpanElement

    constructor(host: VisualizationHost, options: LiquidFillMarkerOptions) {
        if (!Number.isFinite(options.value) || options.value < 0 || options.value > 1) throw new RangeError('Liquid value must be in [0, 1].')
        const viewer = 'viewer' in host ? host.viewer : host
        const doc = viewer.container.ownerDocument
        const content = doc.createElement('div')
        content.className = 'geoearth-liquid'
        const water = doc.createElement('div')
        water.className = 'geoearth-water'
        if (options.color) water.style.background = options.color
        const caption = doc.createElement('span')
        content.append(water, caption)
        super(host, { ...options, content })
        this.water = water
        this.caption = caption
        this.setValue(options.value)
    }

    setValue(value: number): void {
        this.assertAlive()
        if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Liquid value must be in [0, 1].')
        this.water.style.top = `${100 - value * 100}%`
        this.caption.textContent = `${Math.round(value * 100)}%`
        this.requestRender()
    }
}
