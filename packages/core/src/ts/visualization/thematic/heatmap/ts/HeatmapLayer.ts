import {
    Entity, ImageMaterialProperty, Rectangle, RectangleGeometry, GeometryInstance, Primitive,
    EllipsoidSurfaceAppearance, Material, SingleTileImageryProvider, type ImageryLayer,
} from 'cesium'
import { OwnedResource } from '../../../../utils/scene/OwnedResource'
import type { VisualizationHost } from '../../../types'
import heatmap from '../lib/heatmap.js'
import type { HeatmapInstance } from './base/heatmap-types'
import { prepareHeatmap } from './base/prepareHeatmap'
import type { HeatmapLayerOptions, HeatmapPoint, HeatmapStyle } from './types'

/** 先用 heatmap.js 生成纹理，再以实体、图元或单张影像铺到地球表面。 */
export class HeatmapLayer extends OwnedResource {
    readonly ready: Promise<void>
    private readonly container: HTMLDivElement
    private readonly heatmap: HeatmapInstance
    private options: HeatmapLayerOptions
    private points: readonly HeatmapPoint[]
    private entity?: Entity
    private primitive?: Primitive
    private imagery?: ImageryLayer
    private visible: boolean
    private generation = 0

    constructor(host: VisualizationHost, options: HeatmapLayerOptions) {
        prepareHeatmap(options.points, options.bounds)
        if (!Number.isInteger(options.resolution ?? 1024) || (options.resolution ?? 1024) < 32 || (options.resolution ?? 1024) > 4096 || !Number.isFinite(options.height ?? 0)) throw new RangeError('Heatmap resolution must be 32..4096 and height must be finite.')
        if (options.renderType && !['entity', 'primitive', 'imagery'].includes(options.renderType)) throw new RangeError('Invalid heatmap renderType.')
        super(host)
        this.options = { renderType: 'entity', resolution: 1024, height: 0, ...options }
        this.points = options.points.map(point => ({ ...point }))
        this.visible = options.show ?? true
        this.container = this.viewer.container.ownerDocument.createElement('div')
        Object.assign(this.container.style, {
            position: 'absolute',
            left: '-100000px',
            top: '0',
            visibility: 'hidden',
            width: `${this.options.resolution}px`,
            height: `${this.options.resolution}px`,
            pointerEvents: 'none'
        })
        this.viewer.container.append(this.container)
        try {
            this.heatmap = heatmap.create({ radius: 30, maxOpacity: .9, ...options.style, container: this.container })
        }
        catch (error) {
            this.container.remove()
            super.destroy()
            throw error
        }
        this.ready = this.render().catch(error => {
            this.destroy()
            throw error
        })
    }

    get show(): boolean {
        return this.visible
    }

    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        if (this.entity) this.entity.show = value
        if (this.primitive) this.primitive.show = value
        if (this.imagery) this.imagery.show = value
        this.requestRender()
    }

    async setData(points: readonly HeatmapPoint[], range: {
        min?: number
        max?: number
    } = {}): Promise<void> {
        this.assertAlive()
        prepareHeatmap(points, this.options.bounds)
        this.points = points.map(point => ({ ...point }))
        this.options = { ...this.options, ...range }
        await this.render()
    }

    async setRange(min: number, max: number): Promise<void> {
        this.assertAlive()
        this.options = { ...this.options, min, max }
        await this.render()
    }

    async setStyle(style: HeatmapStyle): Promise<void> {
        this.assertAlive()
        this.heatmap.configure({ ...style, container: this.container })
        await this.render()
    }

    async setRadius(radius: number): Promise<void> {
        if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Radius must be positive.')
        await this.setStyle({ radius })
    }

    private async render(): Promise<void> {
        const generation = ++this.generation
        const { bounds, data } = prepareHeatmap(this.points, this.options.bounds)
        let min = this.options.min ?? 0, max = this.options.max ?? 0
        if (this.options.max === undefined) for (const point of data) max = Math.max(max, point.value)
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) throw new RangeError('Heatmap range must satisfy 0 <= min <= max.')
        // heatmap.js 使用 max-min 作除数；常量或全零数据需扩展范围，避免除零。
        if (max === min) max = min + 1
        const size = this.options.resolution!
        this.heatmap.setData({
            min,
            max,
            data: data.map(point => ({
                x: Math.round(point.x * (size - 1)),
                y: Math.round(point.y * (size - 1)),
                value: point.value,
                ...(point.radius === undefined ? {} : { radius: point.radius })
            }))
        })
        const image = this.heatmap.getDataURL()
        const rectangle = Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north)
        if (this.options.renderType === 'imagery') {
            const provider = await SingleTileImageryProvider.fromUrl(image, { rectangle })
            // 图片解码异步完成；过期更新不能重新挂载到已经销毁或更新过的图层。
            if (this.destroyed || this.viewer.isDestroyed() || generation !== this.generation) return
            const layer = this.viewer.imageryLayers.addImageryProvider(provider)
            layer.show = this.visible
            if (this.imagery) this.viewer.imageryLayers.remove(this.imagery, true)
            this.imagery = layer
        } else if (this.options.renderType === 'primitive') {
            const primitive = new Primitive({
                geometryInstances: new GeometryInstance({
                    geometry: new RectangleGeometry({ rectangle, height: this.options.height, vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT })
                }),
                appearance: new EllipsoidSurfaceAppearance({
                    // 热力纹理包含透明背景，使用透明材质让底图和行政边界正常透出。
                    material: new Material({ fabric: { type: 'Image', uniforms: { image } }, translucent: true }),
                    aboveGround: this.options.height! > 0
                }),
                asynchronous: false, show: this.visible,
            })
            this.viewer.scene.primitives.add(primitive)
            if (this.primitive) this.viewer.scene.primitives.remove(this.primitive)
            this.primitive = primitive
        } else {
            if (this.entity) this.viewer.entities.remove(this.entity)
            this.entity = this.viewer.entities.add({
                show: this.visible,
                rectangle: {
                    coordinates: rectangle,
                    height: this.options.height,
                    material: new ImageMaterialProperty({ image, transparent: true })
                }
            })
        }
        this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        ++this.generation
        this.container.remove()
        if (!this.viewer.isDestroyed()) {
            if (this.entity) this.viewer.entities.remove(this.entity)
            if (this.primitive) this.viewer.scene.primitives.remove(this.primitive)
            if (this.imagery) this.viewer.imageryLayers.remove(this.imagery, true)
        }
        super.destroy()
    }
}
