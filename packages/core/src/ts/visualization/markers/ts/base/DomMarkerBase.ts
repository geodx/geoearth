import { Cartesian2, Cartesian3, ConstantPositionProperty, Color, type Entity, type PositionProperty, type PointGraphics } from 'cesium'
import { sampleHeights } from '../../../../utils/scene/heights'
import { OwnedResource } from '../../../../utils/scene/OwnedResource'
import { projectPosition } from '../../../../utils/coordinate/projectPosition'
import { toCartesian } from '../../../../utils/coordinate/positions'
import type { VisualizationHost, VisualizationPosition } from '../../../types'
import '../../styles/markers.css'

export type OverlayAnchor = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'

export interface DomMarkerOptions {
    position: VisualizationPosition | PositionProperty | Entity
    content: HTMLElement | string
    anchor?: OverlayAnchor
    offset?: Cartesian2
    className?: string
    interactive?: boolean
    show?: boolean
    minDistance?: number
    maxDistance?: number
    /** 超出指定相机高度时隐藏；单位：米。 */
    maxCameraHeight?: number
    /** 同时显示地理锚点，样式可通过 point 设置。 */
    showPoint?: boolean
    point?: PointGraphics.ConstructorOptions
    /** 仅适用于静态位置；地形或模型表面高度会异步采样。 */
    heightMode?: 'absolute' | 'terrain' | 'surface'
}

/** 字符串按纯文本显示；自定义富内容请传入 HTMLElement。 */
export class DomMarkerBase extends OwnedResource {
    readonly element: HTMLDivElement
    readonly ready: Promise<void>
    protected readonly contentElement: HTMLDivElement
    protected options: DomMarkerOptions
    private visible: boolean
    private resolvedPosition?: Cartesian3
    private positionTask = 0
    private readonly pointPosition = new ConstantPositionProperty()
    private readonly pointEntity?: Entity
    private mounted?: {
        node: HTMLElement
        parent: Node | null
        next: ChildNode | null
    }

    constructor(host: VisualizationHost, options: DomMarkerOptions) {
        DomMarkerBase.validate(options)
        super(host)
        this.options = { anchor: 'bottom', ...options }
        this.visible = options.show ?? true
        const doc = this.viewer.container.ownerDocument
        this.element = doc.createElement('div')
        this.element.className = `geoearth-html-overlay ${options.className ?? ''}`
        Object.assign(this.element.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            display: 'none',
            zIndex: '1',
            pointerEvents: options.interactive === false ? 'none' : 'auto'
        })
        this.contentElement = doc.createElement('div')
        this.element.append(this.contentElement)
        this.setContent(options.content)
        this.viewer.container.append(this.element)
        if (options.showPoint) {
            this.pointEntity = this.viewer.entities.add({
                position: this.pointPosition,
                point: { pixelSize: 8, color: Color.CYAN, ...options.point },
            })
        }
        this.own(this.viewer.scene.postRender.addEventListener(() => this.updatePosition()))
        this.ready = this.resolvePosition().catch(error => { this.destroy(); throw error })
        this.updatePosition()
        this.requestRender()
    }

    get show(): boolean {
        return this.visible
    }

    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        this.updatePosition()
        this.requestRender()
    }

    async setPosition(position: DomMarkerOptions['position']): Promise<void> {
        this.assertAlive()
        DomMarkerBase.validate({ ...this.options, position })
        this.options.position = position
        await this.resolvePosition()
        this.updatePosition()
        this.requestRender()
    }

    setContent(content: HTMLElement | string): void {
        this.assertAlive()
        this.restoreContent()
        this.contentElement.replaceChildren()
        if (typeof content === 'string') this.contentElement.textContent = content
        else {
            this.mounted = { node: content, parent: content.parentNode, next: content.nextSibling }
            this.contentElement.append(content)
        }
        this.requestRender()
    }

    private restoreContent(): void {
        // 借用已有节点时，卸载后恢复原位置；调用方主动移走的节点不再干预。
        if (!this.mounted) return
        const { node, parent, next } = this.mounted
        if (node.parentNode === this.contentElement) {
            if (parent) parent.insertBefore(node, next?.parentNode === parent ? next : null)
            else node.remove()
        }
        this.mounted = undefined
    }

    private static validate(options: DomMarkerOptions): void {
        const min = options.minDistance ?? 0, max = options.maxDistance ?? Infinity
        if (!Number.isFinite(min) || min < 0 || !(max >= min)) throw new RangeError('Invalid overlay distance range.')
        if (!options.position) throw new Error('Overlay position is required.')
        if (options.anchor && !['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'].includes(options.anchor)) throw new RangeError('Invalid overlay anchor.')
        if (options.offset && ![options.offset.x, options.offset.y].every(Number.isFinite)) throw new RangeError('Overlay offset must be finite.')
        if (!('getValue' in options.position) && !('position' in options.position)) toCartesian(options.position)
        if (options.heightMode && !['absolute', 'terrain', 'surface'].includes(options.heightMode)) throw new RangeError('Invalid overlay heightMode.')
        if (options.maxCameraHeight !== undefined && (!Number.isFinite(options.maxCameraHeight) || options.maxCameraHeight < 0)) throw new RangeError('相机高度上限必须是非负数。')
        if (options.heightMode && options.heightMode !== 'absolute' && ('getValue' in options.position || 'position' in options.position)) throw new Error('Terrain/surface heightMode requires a static position.')
    }

    private async resolvePosition(): Promise<void> {
        // 每次更换位置都会使旧采样失效，避免较慢的请求覆盖新位置。
        const task = ++this.positionTask
        this.resolvedPosition = undefined
        const mode = this.options.heightMode ?? 'absolute', input = this.options.position
        if ('getValue' in input || 'position' in input) {
            if (mode !== 'absolute') throw new Error('Terrain/surface heightMode requires a static position.')
            return
        }
        const original = toCartesian(input)
        if (mode === 'absolute') {
            this.resolvedPosition = original
            return
        }
        const ellipsoid = this.viewer.scene.globe.ellipsoid
        const sample = ellipsoid.cartesianToCartographic(original)
        const [height] = await sampleHeights(this.viewer, [{
            longitude: sample.longitude * 180 / Math.PI,
            latitude: sample.latitude * 180 / Math.PI,
            height: sample.height,
        }], { mode, exclude: this.pointEntity ? [this.pointEntity] : [] })
        if (this.destroyed || this.viewer.isDestroyed() || task !== this.positionTask) return
        this.resolvedPosition = Cartesian3.fromRadians(sample.longitude, sample.latitude, height + sample.height, ellipsoid)
        this.updatePosition()
        this.requestRender()
    }

    protected updatePosition(): void {
        if (this.destroyed || this.viewer.isDestroyed()) return
        const input = this.options.position
        const time = this.viewer.clock.currentTime
        const position = 'getValue' in input ? input.getValue(time) : 'position' in input ? input.position?.getValue(time) : this.resolvedPosition
        const screen = position && projectPosition(this.viewer, position)
        const distance = position ? Cartesian3.distance(position, this.viewer.camera.positionWC) : Infinity
        const withinRange = distance >= (this.options.minDistance ?? 0) && distance <= (this.options.maxDistance ?? Infinity)
            && this.viewer.camera.positionCartographic.height <= (this.options.maxCameraHeight ?? Infinity)
        if (this.pointEntity) {
            this.pointPosition.setValue(position)
            this.pointEntity.show = this.visible && !!position && withinRange
        }
        const width = this.viewer.canvas.clientWidth, height = this.viewer.canvas.clientHeight
        if (!this.visible || !screen || !withinRange || screen.x < 0 || screen.x > width || screen.y < 0 || screen.y > height) {
            this.element.style.display = 'none'
            return
        }
        // 先定位到屏幕像素，再按自身尺寸偏移锚点，不依赖固定宽高。
        const anchor = this.options.anchor!
        const x = anchor.includes('left') ? 0 : anchor.includes('right') ? -100 : -50
        const y = anchor.startsWith('top') ? 0 : anchor.startsWith('bottom') ? -100 : -50
        const offset = this.options.offset ?? Cartesian2.ZERO
        this.element.style.display = 'block'
        this.element.style.transform = `translate(${screen.x + offset.x}px, ${screen.y + offset.y}px) translate(${x}%, ${y}%)`
    }

    override destroy(): void {
        if (this.destroyed) return
        ++this.positionTask
        this.restoreContent()
        this.element.remove()
        if (this.pointEntity && !this.viewer.isDestroyed()) this.viewer.entities.remove(this.pointEntity)
        super.destroy()
    }
}
