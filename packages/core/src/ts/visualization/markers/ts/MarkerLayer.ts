import {
    BillboardCollection, LabelCollection, PointPrimitiveCollection, createGuid,
    type Billboard, type Label, type PointPrimitive,
} from 'cesium'
import { OwnedResource } from '../../../utils/scene/OwnedResource'
import { toCartesian } from '../../../utils/coordinate/positions'
import type { VisualizationHost, VisualizationPosition } from '../../types'

export interface MarkerOptions {
    id?: string
    position: VisualizationPosition
    billboard?: Billboard.ConstructorOptions
    label?: Label.ConstructorOptions
    point?: Parameters<PointPrimitiveCollection['add']>[0]
}

export interface Marker {
    readonly id: string
    billboard?: Billboard
    label?: Label
    point?: PointPrimitive
}

/** 通过 GPU 集合批量绘制文字、图标和点标记，不创建 DOM 或移动相机。 */
export class MarkerLayer extends OwnedResource {
    readonly billboards: BillboardCollection
    readonly labels: LabelCollection
    readonly points: PointPrimitiveCollection
    private readonly markers = new Map<string, Marker>()

    constructor(host: VisualizationHost) {
        super(host)
        this.billboards = this.viewer.scene.primitives.add(new BillboardCollection({ scene: this.viewer.scene }))
        this.labels = this.viewer.scene.primitives.add(new LabelCollection({ scene: this.viewer.scene }))
        this.points = this.viewer.scene.primitives.add(new PointPrimitiveCollection())
    }

    get size(): number {
        return this.markers.size
    }

    get show(): boolean {
        return this.billboards.show
    }

    set show(value: boolean) {
        this.assertAlive()
        this.billboards.show = this.labels.show = this.points.show = value
        this.requestRender()
    }

    add(options: MarkerOptions): Marker {
        this.assertAlive()
        const id = options.id ?? createGuid()
        if (this.markers.has(id)) throw new Error(`Marker already exists: ${id}`)
        if (!options.billboard && !options.label && !options.point) throw new Error('A marker needs a billboard, label or point.')
        const position = toCartesian(options.position)
        const marker: Marker = { id }
        try {
            if (options.billboard) marker.billboard = this.billboards.add({ ...options.billboard, position, id })
            if (options.label) marker.label = this.labels.add({ ...options.label, position, id })
            if (options.point) marker.point = this.points.add({ ...options.point, position, id })
        } catch (error) {
            this.removeGraphics(marker)
            throw error
        }
        this.markers.set(id, marker)
        this.requestRender()
        return marker
    }

    get(id: string): Marker | undefined {
        return this.markers.get(id)
    }

    update(id: string, options: Omit<Partial<MarkerOptions>, 'id'>): void {
        this.assertAlive()
        const marker = this.markers.get(id)
        if (!marker) throw new Error(`Unknown marker: ${id}`)
        if (options.position) this.setPosition(id, options.position)
        for (const key of ['billboard', 'label', 'point'] as const) {
            const style = options[key]
            if (!style) continue
            if (!marker[key]) throw new Error(`Marker ${id} does not have ${key} graphics.`)
            Object.assign(marker[key], style)
        }
        this.requestRender()
    }

    setPosition(id: string, position: VisualizationPosition): void {
        this.assertAlive()
        const marker = this.markers.get(id)
        if (!marker) throw new Error(`Unknown marker: ${id}`)
        const point = toCartesian(position)
        for (const graphic of [marker.billboard, marker.label, marker.point]) if (graphic) graphic.position = point
        this.requestRender()
    }

    remove(id: string): boolean {
        this.assertAlive()
        const marker = this.markers.get(id)
        if (!marker) return false
        this.removeGraphics(marker)
        this.markers.delete(id)
        this.requestRender()
        return true
    }

    clear(): void {
        this.assertAlive()
        this.billboards.removeAll()
        this.labels.removeAll()
        this.points.removeAll()
        this.markers.clear()
        this.requestRender()
    }

    private removeGraphics(marker: Marker): void {
        if (marker.billboard) this.billboards.remove(marker.billboard)
        if (marker.label) this.labels.remove(marker.label)
        if (marker.point) this.points.remove(marker.point)
    }

    override destroy(): void {
        if (this.destroyed) return
        if (!this.viewer.isDestroyed()) {
            for (const collection of [this.billboards, this.labels, this.points]) this.viewer.scene.primitives.remove(collection)
        }
        this.markers.clear()
        super.destroy()
    }
}
