import { Color, EllipsoidSurfaceAppearance, GeometryInstance, Material, PolygonGeometry, PolygonHierarchy, Primitive, buildModuleUrl } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { toCartesian, type WorldPosition } from '../../utils/coordinate/positions'

export interface WaterEffectOptions {
    hierarchy: PolygonHierarchy | readonly WorldPosition[]
    height?: number
    color?: Color
    normalMap?: string
    frequency?: number
    animationSpeed?: number
    amplitude?: number
    specularIntensity?: number
}

/** 普通水面采用 Cesium 公开 Water 材质；法线贴图使用随 Cesium 分发的资源。 */
export class WaterEffect extends OwnedResource {
    readonly primitive: Primitive
    readonly material: Material

    constructor(host: SceneHost, options: WaterEffectOptions) {
        const hierarchy = options.hierarchy instanceof PolygonHierarchy
            ? options.hierarchy : new PolygonHierarchy(options.hierarchy.map(position => toCartesian(position)))
        if (hierarchy.positions.length < 3) throw new RangeError('水面至少需要三个边界点。')
        super(host)
        this.material = new Material({ fabric: { type: 'Water', uniforms: {
            baseWaterColor: options.color ?? new Color(.12, .56, 1, .7),
            normalMap: options.normalMap ?? buildModuleUrl('Assets/Textures/waterNormals.jpg'),
            frequency: options.frequency ?? 100,
            animationSpeed: options.animationSpeed ?? .05,
            amplitude: options.amplitude ?? 1,
            specularIntensity: options.specularIntensity ?? .5,
        } } })
        this.primitive = this.viewer.scene.primitives.add(new Primitive({
            geometryInstances: new GeometryInstance({ geometry: new PolygonGeometry({
                polygonHierarchy: hierarchy, height: options.height ?? 0,
                vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            }) }),
            appearance: new EllipsoidSurfaceAppearance({ material: this.material, aboveGround: true }),
            asynchronous: false,
        }))
        this.own(this.viewer.scene.preUpdate.addEventListener(() => { if (this.show) this.requestRender() }))
        this.requestRender()
    }

    get show(): boolean { return this.primitive.show }
    set show(value: boolean) { this.assertAlive(); this.primitive.show = value; this.requestRender() }

    override destroy(): void {
        if (this.destroyed) return
        super.destroy()
        if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.primitive)
    }
}
