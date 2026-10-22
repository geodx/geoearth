import { ClassificationPrimitive, ClassificationType, Color, ColorGeometryInstanceAttribute, GeometryInstance, PolygonGeometry, PolygonHierarchy } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { toCartesian } from '../../utils/coordinate/positions'

import type { HeightLimitOptions } from './types'
export type { HeightLimitOptions } from './types'

/** 高亮边界内超过阈值的 3D Tiles；不改变全场景的反向分类开关。 */
export class HeightLimitAnalysis extends OwnedResource {
    private primitive: ClassificationPrimitive
    private readonly hierarchy: PolygonHierarchy
    private readonly upper: number
    private readonly color: Color
    private threshold: number

    constructor(host: SceneHost, options: HeightLimitOptions) {
        const upper = options.upperHeight ?? 200000
        if (!Number.isFinite(options.height) || !Number.isFinite(upper) || upper <= options.height) throw new RangeError('限高上界必须大于阈值。')
        const hierarchy = options.hierarchy instanceof PolygonHierarchy ? options.hierarchy : new PolygonHierarchy(options.hierarchy.map(position => toCartesian(position)))
        if (hierarchy.positions.length < 3) throw new RangeError('限高范围至少需要三个点。')
        super(host)
        this.hierarchy = hierarchy
        this.upper = upper
        this.color = Color.clone(options.color ?? Color.RED.withAlpha(.6))
        this.threshold = options.height
        this.primitive = this.createPrimitive()
    }

    get height(): number { return this.threshold }
    set height(value: number) {
        this.assertAlive()
        if (!Number.isFinite(value) || value >= this.upper) throw new RangeError('限高阈值必须小于上界。')
        const visible = this.show
        this.threshold = value
        this.viewer.scene.primitives.remove(this.primitive)
        this.primitive = this.createPrimitive()
        this.show = visible
    }

    get show(): boolean { return this.primitive.show }
    set show(value: boolean) { this.assertAlive(); this.primitive.show = value; this.requestRender() }

    private createPrimitive(): ClassificationPrimitive {
        const primitive = this.viewer.scene.primitives.add(new ClassificationPrimitive({
            classificationType: ClassificationType.CESIUM_3D_TILE,
            geometryInstances: new GeometryInstance({ geometry: new PolygonGeometry({
                polygonHierarchy: this.hierarchy, height: this.threshold, extrudedHeight: this.upper,
            }), attributes: { color: ColorGeometryInstanceAttribute.fromColor(this.color) } }),
        }))
        this.requestRender()
        return primitive
    }

    override destroy(): void {
        if (this.destroyed) return
        if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.primitive)
        super.destroy()
    }
}
