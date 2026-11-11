import { Cartesian3, ClassificationPrimitive, ClassificationType, Color, ColorGeometryInstanceAttribute, GeometryInstance, PolygonGeometry, PolygonHierarchy } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { toCartesian } from '../../utils/coordinate/positions'
import { getSurfaceArea } from '../../utils/geometry/measurements'

import type { HeightLimitOptions } from './types'
export type { HeightLimitOptions } from './types'

type HeightLimitSettings = Required<Omit<HeightLimitOptions, 'hierarchy'>> & { hierarchy: PolygonHierarchy }

function copyHierarchy(input: HeightLimitOptions['hierarchy']): PolygonHierarchy {
    const ring = input instanceof PolygonHierarchy ? input.positions : input
    const positions = ring.map(position => toCartesian(position))
    if (positions.length > 1 && Cartesian3.equals(positions[0], positions[positions.length - 1])) positions.pop()
    if (positions.length < 3 || positions.some(position => Cartesian3.magnitudeSquared(position) === 0)) {
        throw new RangeError('限高范围至少需要三个有效的地理位置。')
    }
    if (getSurfaceArea(positions) < 0.01) throw new RangeError('限高范围必须具有有效面积。')
    const holes = input instanceof PolygonHierarchy ? input.holes.map(hole => copyHierarchy(hole)) : []
    return new PolygonHierarchy(positions, holes)
}

function resolveOptions(options: HeightLimitOptions): HeightLimitSettings {
    const upperHeight = options.upperHeight ?? 200000
    if (!Number.isFinite(options.height) || !Number.isFinite(upperHeight) || upperHeight <= options.height) {
        throw new RangeError('限高上界必须大于阈值，且两者均为有限数值。')
    }
    const color = options.color ?? Color.RED.withAlpha(0.6)
    if (![color.red, color.green, color.blue, color.alpha].every(Number.isFinite)) throw new RangeError('限高颜色各分量必须为有限数值。')
    return {
        height: options.height, upperHeight, color: Color.clone(color),
        hierarchy: copyHierarchy(options.hierarchy), show: options.show ?? true,
    }
}

/** 按水平范围和绝对椭球高分类高亮 3D Tiles 表面。 */
export class HeightLimitAnalysis extends OwnedResource {
    private primitive: ClassificationPrimitive
    private settings: HeightLimitSettings

    constructor(host: SceneHost, options: HeightLimitOptions) {
        const settings = resolveOptions(options)
        super(host)
        this.settings = settings
        try {
            this.primitive = this.createPrimitive(settings)
            this.requestRender()
        } catch (error) {
            super.destroy()
            throw error
        }
    }

    get height(): number { return this.settings.height }
    set height(value: number) {
        this.assertAlive()
        if (!Number.isFinite(value)) throw new RangeError('限高阈值必须为有限数值。')
        if (value !== this.height) this.update({ height: value })
    }

    get upperHeight(): number { return this.settings.upperHeight }

    get color(): Color { return Color.clone(this.settings.color) }

    get show(): boolean { return this.settings.show }
    set show(value: boolean) {
        this.assertAlive()
        this.settings.show = this.primitive.show = value
        this.requestRender()
    }

    /** 校验并创建新分类体后再替换旧实例，无效更新保留原结果。 */
    update(options: Partial<HeightLimitOptions>): void {
        this.assertAlive()
        const next = resolveOptions({
            hierarchy: options.hierarchy ?? this.settings.hierarchy,
            height: options.height ?? this.height,
            upperHeight: options.upperHeight ?? this.upperHeight,
            color: options.color ?? this.settings.color,
            show: options.show ?? this.show,
        })
        const primitive = this.createPrimitive(next)
        const previous = this.primitive
        this.primitive = primitive
        this.settings = next
        this.viewer.scene.primitives.remove(previous)
        this.requestRender()
    }

    private createPrimitive(settings: HeightLimitSettings): ClassificationPrimitive {
        return this.viewer.scene.primitives.add(new ClassificationPrimitive({
            asynchronous: false,
            show: settings.show,
            classificationType: ClassificationType.CESIUM_3D_TILE,
            geometryInstances: new GeometryInstance({
                geometry: new PolygonGeometry({
                    polygonHierarchy: settings.hierarchy,
                    height: settings.height,
                    extrudedHeight: settings.upperHeight,
                }),
                attributes: { color: ColorGeometryInstanceAttribute.fromColor(settings.color) },
            }),
        }))
    }

    override destroy(): void {
        if (this.destroyed) return
        if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.primitive)
        super.destroy()
    }
}
