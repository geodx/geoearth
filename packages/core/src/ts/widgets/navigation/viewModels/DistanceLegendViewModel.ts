import type { Viewer } from 'cesium'
import { getDistanceLegendInfo } from '../core/getDistanceLegendInfo'

/** 比例尺线段的最大长度，单位为 CSS 像素。 */
const MAX_BAR_WIDTH = 100
/** 比例尺的最小更新间隔，单位为毫秒。 */
const UPDATE_INTERVAL = 250

/** 导航插件内部的比例尺，由 Navigation 统一配置和管理。 */
export default class DistanceLegendViewModel {
    private root?: HTMLElement
    private label?: HTMLElement
    private bar?: HTMLElement
    private host?: HTMLElement
    private removeRenderListener?: () => void
    private resizeObserver?: ResizeObserver
    private timer?: ReturnType<typeof setTimeout>
    private lastUpdate = 0
    private visible = false

    constructor(private readonly viewer: Viewer) {}

    open(host: HTMLElement): void {
        this.assertAlive()
        if (this.root) { this.show(); return }
        const doc = host.ownerDocument
        const root = doc.createElement('div')
        root.className = 'distance-legend'
        root.style.display = 'none'
        this.host = host
        this.root = root
        this.label = doc.createElement('div')
        this.label.className = 'distance-legend-label'
        this.bar = doc.createElement('div')
        this.bar.className = 'distance-legend-scale-bar'
        root.append(this.label, this.bar)
        host.appendChild(root)
        this.visible = true
        try {
            this.removeRenderListener = this.viewer.scene.postRender.addEventListener(() => this.scheduleUpdate())
            this.resizeObserver = new ResizeObserver(() => this.update())
            this.resizeObserver.observe(this.viewer.scene.canvas)
            this.resizeObserver.observe(host)
            this.update()
        } catch (error) {
            this.destroy()
            throw error
        }
    }

    show(): void {
        this.assertAlive()
        if (!this.root) return
        this.visible = true
        this.update()
    }

    hide(): void {
        this.visible = false
        if (this.root) this.root.style.display = 'none'
        this.clearTimer()
    }

    destroy(): void {
        this.hide()
        this.removeRenderListener?.()
        this.removeRenderListener = undefined
        this.resizeObserver?.disconnect()
        this.resizeObserver = undefined
        this.root?.remove()
        this.root = undefined
        this.host = undefined
        this.label = undefined
        this.bar = undefined
    }

    private scheduleUpdate(): void {
        if (!this.visible || this.timer !== undefined) return
        const remaining = UPDATE_INTERVAL - (performance.now() - this.lastUpdate)
        if (remaining <= 0) this.update()
        else this.timer = setTimeout(() => { this.timer = undefined; this.update() }, remaining)
    }

    private update(): void {
        this.clearTimer()
        if (!this.visible || !this.root || this.viewer.isDestroyed()) return
        this.lastUpdate = performance.now()
        // 预留两侧各 16 像素的边距，以及左右各 10 像素的内边距。
        const availableWidth = Math.min(this.host!.clientWidth, this.viewer.scene.canvas.clientWidth) - 32 - 20
        const width = Math.min(MAX_BAR_WIDTH, availableWidth)
        const info = width > 0 ? getDistanceLegendInfo(this.viewer, width) : undefined
        this.root.style.display = info ? '' : 'none'
        if (!info) return
        this.label!.textContent = info.label
        this.bar!.style.width = `${info.width}px`
        this.root.setAttribute('aria-label', `Scale: ${info.label}`)
    }

    private clearTimer(): void {
        if (this.timer !== undefined) clearTimeout(this.timer)
        this.timer = undefined
    }

    private assertAlive(): void {
        if (this.viewer.isDestroyed()) throw new Error('Navigation viewer has been destroyed')
    }
}
