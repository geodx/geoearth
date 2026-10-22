import { Cartesian2, Matrix4 } from 'cesium'
import { OwnedResource } from '../../../../../utils/scene/OwnedResource'
import type { VisualizationHost } from '../../../../types'
import mapv from '../lib/mapv.js'
import { MapVRenderer } from './base/MapVRenderer'
import type { MapVDataItem, MapVDataSet, MapVOptions } from './types'

/** 每个实例持有自己的画布、数据和帧监听，销毁时统一解除。 */
export class MapVLayer extends OwnedResource {
    readonly canvas: HTMLCanvasElement
    private readonly renderer: MapVRenderer
    private readonly data: MapVDataSet
    private readonly matrix = new Matrix4()
    private options: MapVOptions
    private visible = true
    private dirty = true
    private elapsed = 0
    private last = 0
    private width = 0
    private height = 0

    constructor(host: VisualizationHost, data: MapVDataSet | MapVDataItem[], options: MapVOptions = {}) {
        MapVLayer.validateAnimation(options)
        super(host)
        this.options = { context: '2d', draw: 'simple', ...options }
        const doc = this.viewer.container.ownerDocument
        this.canvas = doc.createElement('canvas')
        this.canvas.className = 'geoearth-mapv-layer'
        Object.assign(this.canvas.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: String(options.zIndex ?? 1) })
        this.viewer.container.append(this.canvas)
        try {
            this.data = new mapv.DataSet(Array.isArray(data) ? data : data.get())
            this.renderer = new MapVRenderer(this.viewer, this.canvas, this.data, this.options)
        }
        catch (error) {
            this.canvas.remove()
            super.destroy()
            throw error
        }
        this.last = performance.now()
        this.own(this.viewer.scene.postRender.addEventListener(() => this.frame()))
        if (options.methods?.click || options.methods?.mousemove) {
            for (const [event, callback] of [['click', options.methods.click], ['mousemove', options.methods.mousemove]] as const) {
                if (!callback) continue
                const listener = (e: MouseEvent) => {
                    if (!this.visible) return
                    const rect = this.viewer.canvas.getBoundingClientRect()
                    callback(this.renderer.hitTest(new Cartesian2(e.clientX - rect.left, e.clientY - rect.top)), e)
                }
                this.viewer.canvas.addEventListener(event, listener)
                this.own(() => this.viewer.canvas.removeEventListener(event, listener))
            }
        }
        try {
            this.frame()
            this.requestRender()
        }
        catch (error) {
            this.destroy()
            throw error
        }
        this.own(this.viewer.scene.preUpdate.addEventListener(() => {
            if (this.visible && this.options.animation?.enabled !== false && this.options.animation) this.requestRender()
        }))
    }

    get show(): boolean {
        return this.visible
    }

    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        this.canvas.hidden = !value
        this.last = performance.now()
        this.dirty = true
        this.requestRender()
    }

    getData(): MapVDataItem[] {
        this.assertAlive()
        return this.data.get()
    }

    updateData(data: MapVDataSet | MapVDataItem[], options: MapVOptions = {}): void {
        this.assertAlive()
        MapVLayer.validateAnimation({ ...this.options, ...options })
        this.data.set(Array.isArray(data) ? data : data.get())
        this.setOptions(options)
    }

    addData(data: MapVDataSet | MapVDataItem[]): void {
        this.assertAlive()
        this.data.add(Array.isArray(data) ? data : data.get())
        this.setOptions({})
    }

    removeData(filter: (item: MapVDataItem) => boolean): void {
        this.assertAlive()
        this.data.set(this.data.get().filter(item => !filter(item)))
        this.setOptions({})
    }

    clear(): void {
        this.assertAlive()
        this.data.clear()
        this.setOptions({})
    }

    setOptions(options: MapVOptions): void {
        this.assertAlive()
        MapVLayer.validateAnimation({ ...this.options, ...options })
        this.renderer.setOptions(options)
        this.options = { ...this.options, ...options }
        this.dirty = true
        this.requestRender()
    }

    resize(): void {
        this.assertAlive()
        this.width = -1
        this.dirty = true
        this.requestRender()
    }

    private static validateAnimation(options: MapVOptions): void {
        const animation = options.animation
        if (!animation || animation.enabled === false) return
        if (!Number.isFinite(animation.duration ?? 5) || (animation.duration ?? 5) <= 0) throw new RangeError('Animation duration must be positive.')
        if (animation.stepsRange && (!Number.isFinite(animation.stepsRange.start) || !Number.isFinite(animation.stepsRange.end) || animation.stepsRange.end <= animation.stepsRange.start)) throw new RangeError('Animation stepsRange must increase.')
    }

    private frame(): void {
        if (this.destroyed || !this.visible) return
        const width = this.viewer.canvas.clientWidth, height = this.viewer.canvas.clientHeight
        // 投影位置使用 CSS 像素；仅在画布缓冲区应用像素比，避免高分屏错位。
        const dpr = this.viewer.container.ownerDocument.defaultView?.devicePixelRatio ?? 1
        if (width !== this.width || height !== this.height || this.canvas.width !== Math.round(width * dpr)) {
            this.width = width
            this.height = height
            this.canvas.width = Math.max(1, Math.round(width * dpr))
            this.canvas.height = Math.max(1, Math.round(height * dpr))
            this.canvas.style.width = `${width}px`
            this.canvas.style.height = `${height}px`
            this.renderer.canvasLayer.devicePixelRatio = dpr
            this.dirty = true
        }
        const animation = this.options.animation
        const active = animation && animation.enabled !== false
        // 静态数据只在数据、视口或相机变化时重绘；动画由当前图层独立推进。
        if (this.dirty || active || !Matrix4.equals(this.matrix, this.viewer.camera.viewMatrix)) {
            const now = performance.now()
            this.elapsed += Math.max(0, now - this.last) / 1000
            this.last = now
            const range = animation?.stepsRange ?? { start: 0, end: Math.max(1, ...this.data.get().map(item => item.time ?? 0)) }
            const step = active ? range.start + (this.elapsed % (animation.duration ?? 5)) / (animation.duration ?? 5) * (range.end - range.start) : undefined
            this.renderer.render(step)
            this.dirty = false
            Matrix4.clone(this.viewer.camera.viewMatrix, this.matrix)
        }
    }

    override destroy(): void {
        if (this.destroyed) return
        super.destroy()
        this.canvas.remove()
        this.data.clear()
    }
}
