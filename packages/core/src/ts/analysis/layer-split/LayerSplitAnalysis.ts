import { SplitDirection, type ImageryLayer } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'

import type { LayerSplitOptions } from './types'
export type { LayerSplitOptions } from './types'

/** 影像卷帘只借用图层，销毁时恢复原有分屏方向和场景分界位置。 */
export class LayerSplitAnalysis extends OwnedResource {
    readonly slider: HTMLDivElement
    private readonly previousPosition: number
    private readonly previousDirections = new Map<ImageryLayer, SplitDirection>()
    private previousInputs?: boolean
    private pointer?: number

    constructor(host: SceneHost, options: LayerSplitOptions = {}) {
        if (options.left?.some(layer => options.right?.includes(layer))) throw new Error('同一影像图层不能同时属于左右窗口。')
        if (!Number.isFinite(options.position ?? .5)) throw new RangeError('卷帘位置必须为有限数值。')
        super(host)
        this.previousPosition = this.viewer.scene.splitPosition
        const doc = this.viewer.container.ownerDocument
        this.slider = doc.createElement('div')
        this.slider.className = 'geoearth-layer-split'
        this.slider.setAttribute('role', 'slider')
        this.slider.setAttribute('aria-label', '影像卷帘分界线')
        this.slider.setAttribute('aria-valuemin', '0')
        this.slider.setAttribute('aria-valuemax', '100')
        this.slider.tabIndex = 0
        Object.assign(this.slider.style, {
            position: 'absolute', top: '0', width: '6px', height: '100%',
            transform: 'translateX(-50%)', background: '#a9edff', cursor: 'ew-resize', zIndex: '2', touchAction: 'none'
        })
        this.viewer.container.append(this.slider)
        for (const layer of options.left ?? []) this.addLayer(layer, SplitDirection.LEFT)
        for (const layer of options.right ?? []) this.addLayer(layer, SplitDirection.RIGHT)
        this.setPosition(options.position ?? .5)
        const down = (event: PointerEvent) => {
            if (this.pointer !== undefined) return
            event.preventDefault()
            this.pointer = event.pointerId
            this.previousInputs = this.viewer.scene.screenSpaceCameraController.enableInputs
            this.viewer.scene.screenSpaceCameraController.enableInputs = false
            this.slider.setPointerCapture(event.pointerId)
        }
        const move = (event: PointerEvent) => {
            if (event.pointerId !== this.pointer) return
            const rectangle = this.viewer.canvas.getBoundingClientRect()
            if (rectangle.width) this.setPosition((event.clientX - rectangle.left) / rectangle.width)
        }
        const up = () => this.releasePointer()
        const key = (event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            this.setPosition(this.position + (event.key === 'ArrowRight' ? .01 : -.01))
        }
        for (const [type, listener] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['lostpointercapture', up], ['keydown', key]] as const) {
            this.slider.addEventListener(type, listener as EventListener)
            this.own(() => this.slider.removeEventListener(type, listener as EventListener))
        }
    }

    get position(): number { return this.viewer.scene.splitPosition }

    setPosition(position: number): void {
        this.assertAlive()
        if (!Number.isFinite(position)) throw new RangeError('卷帘位置必须为有限数值。')
        const ratio = Math.max(0, Math.min(1, position))
        this.viewer.scene.splitPosition = ratio
        this.slider.style.left = `${ratio * 100}%`
        this.slider.setAttribute('aria-valuenow', String(Math.round(ratio * 100)))
        this.requestRender()
    }

    addLayer(layer: ImageryLayer, direction: SplitDirection): void {
        this.assertAlive()
        if (!this.previousDirections.has(layer)) this.previousDirections.set(layer, layer.splitDirection)
        layer.splitDirection = direction
        this.requestRender()
    }

    private releasePointer(): void {
        const pointer = this.pointer
        this.pointer = undefined
        if (pointer !== undefined && this.slider.hasPointerCapture(pointer)) this.slider.releasePointerCapture(pointer)
        if (this.previousInputs !== undefined && !this.viewer.isDestroyed()) this.viewer.scene.screenSpaceCameraController.enableInputs = this.previousInputs
        this.previousInputs = undefined
    }

    override destroy(): void {
        if (this.destroyed) return
        this.releasePointer()
        if (!this.viewer.isDestroyed()) {
            for (const [layer, direction] of this.previousDirections) if (!layer.isDestroyed()) layer.splitDirection = direction
            this.viewer.scene.splitPosition = this.previousPosition
        }
        this.previousDirections.clear()
        this.slider.remove()
        super.destroy()
    }
}
