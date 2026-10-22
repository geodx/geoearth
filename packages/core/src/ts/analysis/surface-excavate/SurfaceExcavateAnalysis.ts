import { Cartesian3, Cartographic, ClippingPolygon, ClippingPolygonCollection, ConstantProperty, Entity, ImageMaterialProperty, Math as CesiumMath, PolygonGraphics, PolygonHierarchy, WallGraphics } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { toCartesian } from '../../utils/coordinate/positions'
import { interpolateSegment } from '../../utils/geometry/spatial'
import { sampleHeights } from '../../utils/scene/heights'

import type { SurfaceExcavateOptions } from './types'
export type { SurfaceExcavateOptions } from './types'

/** 单个无孔开挖区域，使用公开多边形裁剪 API；地球已有裁剪时不接管。 */
export class SurfaceExcavateAnalysis extends OwnedResource {
    readonly ready: Promise<void>
    readonly entity: Entity
    private clipping?: ClippingPolygonCollection
    private topHeights: number[] = []
    private amount: number
    private visible = true

    constructor(host: SceneHost, options: SurfaceExcavateOptions) {
        const depth = options.depth ?? 200, spacing = options.spacing ?? 50
        if (!Number.isFinite(depth) || depth <= 0 || !Number.isFinite(spacing) || spacing <= 0) throw new RangeError('开挖深度和采样间距必须为正数。')
        const positions = options.positions.map(position => toCartesian(position))
        if (positions.length > 1 && Cartesian3.equals(positions[0], positions[positions.length - 1])) positions.pop()
        if (positions.length < 3) throw new RangeError('开挖边界至少需要三个点。')
        const viewer = 'viewer' in host ? host.viewer : host
        if (!ClippingPolygonCollection.isSupported(viewer.scene)) throw new Error('当前 WebGL 环境不支持多边形裁剪。')
        if (viewer.scene.globe.clippingPlanes || viewer.scene.globe.clippingPolygons) throw new Error('地球已有裁剪，请先释放后再创建开挖。')
        super(host)
        this.amount = depth
        this.entity = this.viewer.entities.add({ show: false })
        this.ready = this.initialize(positions, options, spacing).catch(error => { this.destroy(); throw error })
    }

    get depth(): number { return this.amount }
    set depth(value: number) {
        this.assertAlive()
        if (!Number.isFinite(value) || value <= 0) throw new RangeError('开挖深度必须为正数。')
        this.amount = value
        this.updateDepth()
    }

    get show(): boolean { return this.visible }
    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        this.entity.show = value && !!this.clipping
        if (this.clipping) this.clipping.enabled = value
        this.requestRender()
    }

    private async initialize(positions: Cartesian3[], options: SurfaceExcavateOptions, spacing: number): Promise<void> {
        // 三维插值后再采样地表，壁面顶边随地形起伏，底面保持水平。
        const boundary = positions.flatMap((point, index) => interpolateSegment(point, positions[(index + 1) % positions.length], spacing).slice(0, -1))
        const locations = boundary.map(point => Cartographic.fromCartesian(point))
        this.topHeights = options.sampleTerrain === false ? locations.map(point => point.height)
            : await sampleHeights(this.viewer, locations.map(point => ({ longitude: CesiumMath.toDegrees(point.longitude), latitude: CesiumMath.toDegrees(point.latitude), height: 0 })), { mode: 'terrain' })
        if (this.destroyed || this.viewer.isDestroyed()) return
        const globe = this.viewer.scene.globe
        if (globe.clippingPlanes || globe.clippingPolygons) throw new Error('高度采样期间地球已被其他裁剪功能接管。')
        const tops = locations.map((point, index) => Cartesian3.fromRadians(point.longitude, point.latitude, this.topHeights[index]))
        this.entity.polygon = new PolygonGraphics({ hierarchy: new PolygonHierarchy(tops), material: new ImageMaterialProperty({
            image: options.bottomImage ?? new URL('./assets/bottom.jpg?no-inline', import.meta.url).href,
        }) })
        this.entity.wall = new WallGraphics({ positions: [...tops, tops[0]], maximumHeights: [...this.topHeights, this.topHeights[0]], material: new ImageMaterialProperty({
            image: options.sideImage ?? new URL('./assets/side.jpg?no-inline', import.meta.url).href,
        }) })
        this.clipping = new ClippingPolygonCollection({ polygons: [new ClippingPolygon({ positions })], enabled: this.visible })
        globe.clippingPolygons = this.clipping
        this.updateDepth()
        this.entity.show = this.visible
    }

    private updateDepth(): void {
        if (!this.entity.polygon || !this.entity.wall) return
        const bottom = this.topHeights.reduce((lowest, height) => Math.min(lowest, height), Infinity) - this.amount
        this.entity.polygon.height = new ConstantProperty(bottom)
        this.entity.wall.minimumHeights = new ConstantProperty(Array(this.topHeights.length + 1).fill(bottom))
        this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        if (!this.viewer.isDestroyed()) {
            if (this.clipping && this.viewer.scene.globe.clippingPolygons === this.clipping) this.viewer.scene.globe.clippingPolygons = undefined
            this.viewer.entities.remove(this.entity)
        }
        // Globe 的 setter 负责销毁所属裁剪集合，避免二次释放纹理。
        super.destroy()
    }
}
