import {
    BoundingSphere, Cartesian3, Cartographic, Color,
    EllipsoidSurfaceAppearance, GeometryInstance, Material, Matrix4,
    PolygonGeometry, PolygonHierarchy, Primitive,
    Transforms
} from 'cesium'
import { toCartesian, type WorldPosition } from '../../utils/coordinate/positions'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { ReflectionPass } from './ReflectionPass'
import { waterFragmentShader, waterSource } from './waterShader'
import { refineWaterGeometry } from './waterGeometry'
import { waterVertexShader } from './waterVertexShader'

export interface WaterStyleOptions {
    /** 折射与 Beer-Lambert 吸收，默认 true；仅水面上方的透视 3D 相机。 */
    refraction?: boolean
    /** 折射偏移倍率，范围 0—1，默认 0.65。 */
    refractionStrength?: number
    /** RGB 每米吸收系数，默认 (0.28, 0.09, 0.045)，必须非负。 */
    absorption?: Cartesian3
    /** 实际浅水交界处的泡沫，默认 true。 */
    foam?: boolean
    /** 产生泡沫的水深范围，单位米，默认 1.2。 */
    foamWidth?: number
    /** 泡沫覆盖强度，范围 0—1，默认 0.7。 */
    foamOpacity?: number
    /** 观察水深（深水为蓝）、折射原色或泡沫遮罩。 */
    debugView?: 'surface' | 'depth' | 'refraction' | 'foam' | 'normals'
    /** 水深观察视图的满量程，单位米，默认 10。 */
    depthRange?: number
    /** 几何波浪的最大垂直振幅，单位米，范围 0—10，默认 0.35。 */
    waveHeight?: number
    /** Gerstner 水平位移强度，范围 0—1，默认 0.35。 */
    waveSteepness?: number
    /** 边界及岛洞附近波浪衰减距离，单位米，默认 12。 */
    shoreFadeDistance?: number
    color?: Color
    /** 程序化细波纹密度，默认 100，0 关闭细波纹。 */
    frequency?: number
    /** 波纹时间倍率，默认 1；设为 0 可暂停。 */
    animationSpeed?: number
    /** 程序化细浪法线强度，不改变几何高度；0 只保留几何法线。 */
    amplitude?: number
    specularIntensity?: number
    distortionScale?: number
    reflectionStrength?: number
    reflection?: boolean
    /** 是否把当前场景天空盒和大气绘入倒影。默认 true。 */
    skyReflection?: boolean
    /** 第一组几何波长及程序化细波纹尺度基准，单位米，默认 80。 */
    waveLength?: number
    /** 波纹方向（相对局部正东的角度），单位度。 */
    waveDirection?: number
    /** 近处细波纹强度，默认 0.25。 */
    rippleStrength?: number
    /** 微表面粗糙度，范围 0.03—1，默认 0.18。 */
    roughness?: number
    /** 散射光强度，默认 0.65。 */
    scattering?: number
    /** 太阳光色调；方向始终使用 Cesium 当前时间对应的真实太阳。 */
    sunColor?: Color
}

export interface WaterEffectOptions extends WaterStyleOptions {
    /** 网格最大边长，单位米，默认 8；构造后不可变。 */
    meshSize?: number
    hierarchy: PolygonHierarchy | readonly WorldPosition[]
    /** 水面中心的椭球高度，单位米。水域按中心切平面展开。 */
    height?: number
    /** 固定离屏纹理边长，默认 512，范围 64—2048。 */
    reflectionSize?: number
    /** 水下颜色及深度纹理边长，默认与 reflectionSize 相同。 */
    refractionSize?: number
}

const waters = new WeakMap<object, Set<Primitive>>()

/** 局部水域：Gerstner 网格、场景反射、水下折射吸收与深度泡沫。 */
export class WaterEffect extends OwnedResource {
    readonly primitive: Primitive
    readonly material: Material
    private readonly reflectionPass: ReflectionPass
    private readonly underwaterPass: ReflectionPass
    private previousTime: number | undefined

    constructor(host: SceneHost, options: WaterEffectOptions) {
        const hierarchy = options.hierarchy instanceof PolygonHierarchy
            ? options.hierarchy : new PolygonHierarchy(options.hierarchy.map(position => toCartesian(position)))
        if (hierarchy.positions.length < 3) throw new RangeError('水面至少需要三个边界点。')
        const size = options.reflectionSize ?? 512
        if (!Number.isInteger(size) || size < 64 || size > 2048) throw new RangeError('reflectionSize 必须是 64—2048 的整数。')
        const refractionSize = options.refractionSize ?? size
        if (!Number.isInteger(refractionSize) || refractionSize < 64 || refractionSize > 2048) throw new RangeError('refractionSize 必须是 64—2048 的整数。')
        if (!Number.isFinite(options.height ?? 0)) throw new RangeError('height 必须是有限数值。')
        validateStyle(options)
        const spacing = options.meshSize ?? 8
        if (!Number.isFinite(spacing) || spacing < 1) throw new RangeError('meshSize 必须是大于等于 1 的有限数值。')
        const center = BoundingSphere.fromPoints(hierarchy.positions).center
        const cartographic = Cartographic.fromCartesian(center)
        const origin = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, options.height ?? 0)
        const frame = Transforms.eastNorthUpToFixedFrame(origin)
        const inverse = Matrix4.inverseTransformation(frame, new Matrix4())
        const polygon = PolygonGeometry.createGeometry(new PolygonGeometry({
            polygonHierarchy: hierarchy, height: options.height ?? 0,
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }))
        if (!polygon) throw new RangeError('水面边界无法构成多边形。')
        const geometry = refineWaterGeometry(polygon, hierarchy, inverse, spacing)
        super(host)
        const scene = this.viewer.scene
        this.reflectionPass = new ReflectionPass(scene, frame, size)
        this.underwaterPass = new ReflectionPass(scene, frame, refractionSize, true)
        this.material = new Material({
            fabric: {
                type: 'GeoEarthReflectiveWater',
                uniforms: {
                    baseWaterColor: Color.clone(options.color ?? new Color(.035, .25, .30, .92)),
                    frequency: options.frequency ?? 100,
                    animationSpeed: options.animationSpeed ?? 1,
                    amplitude: options.amplitude ?? 1,
                    waveHeight: options.waveHeight ?? .35,
                    waveSteepness: options.waveSteepness ?? .35,
                    shoreFadeDistance: options.shoreFadeDistance ?? 12,
                    refraction: options.refraction === false ? 0 : 1,
                    refractionStrength: options.refractionStrength ?? .65,
                    absorption: Cartesian3.clone(options.absorption ?? new Cartesian3(.28, .09, .045)),
                    foam: options.foam === false ? 0 : 1,
                    foamWidth: options.foamWidth ?? 1.2,
                    foamOpacity: options.foamOpacity ?? .7,
                    debugView: debugViews.indexOf(options.debugView ?? 'surface'),
                    depthRange: options.depthRange ?? 10,
                    underwaterReady: 0,
                    underwaterColorMap: Material.DefaultImageId,
                    underwaterDepthMap: Material.DefaultImageId,
                    underwaterMatrix: Object.assign(Matrix4.clone(Matrix4.IDENTITY), { type: 'mat4' }),
                    underwaterInverseMatrix: Object.assign(Matrix4.clone(Matrix4.IDENTITY), { type: 'mat4' }),
                    specularIntensity: options.specularIntensity ?? .8,
                    distortionScale: options.distortionScale ?? 12,
                    reflectionStrength: options.reflectionStrength ?? 1,
                    waveLength: options.waveLength ?? 80,
                    waveDirection: options.waveDirection ?? 0,
                    rippleStrength: options.rippleStrength ?? .25,
                    roughness: options.roughness ?? .18,
                    scattering: options.scattering ?? .65,
                    sunColor: Color.clone(options.sunColor ?? Color.WHITE),
                    time: 0,
                    reflectionReady: 0,
                    reflectionTexelSize: 1 / size,
                    reflectionMap: Material.DefaultImageId,
                    // 显式类型避免 Cesium 合并同类型材质模板时将数组变为普通对象。
                    reflectionMatrix: Object.assign(Matrix4.clone(Matrix4.IDENTITY), { type: 'mat4' }),
                },
                source: waterSource,
            },
            translucent: () => {
                const u = this.material.uniforms
                // Captured refraction already contains the background: render this composite
                // as opaque rather than feeding it through weighted transparent accumulation.
                return u.debugView < .5 && (u.refraction < .5 || u.underwaterReady < .5) && u.baseWaterColor.alpha < 1
            },
        })
        // A depth sampler needs high precision even when color samplers may use lowp.
        this.material.shaderSource = this.material.shaderSource.replace(/uniform sampler2D (underwaterDepthMap_\d+);/g, 'uniform highp sampler2D $1;')
        this.reflectionPass.enabled = options.reflection ?? true
        this.reflectionPass.skyReflection = options.skyReflection ?? true
        this.reflectionPass.bindMaterial(this.material)
        this.underwaterPass.bindMaterial(this.material)
        this.primitive = scene.primitives.add(new Primitive({
            geometryInstances: new GeometryInstance({ geometry }),
            modelMatrix: frame,
            appearance: new EllipsoidSurfaceAppearance({
                material: this.material, aboveGround: true, faceForward: false,
                vertexShaderSource: waterVertexShader(this.material),
                fragmentShaderSource: waterFragmentShader,
            }),
            asynchronous: false, compressVertices: false,
        }))
        const group = waters.get(scene) ?? new Set<Primitive>()
        waters.set(scene, group)
        group.add(this.primitive)
        this.own(() => group.delete(this.primitive))
        this.own(scene.preRender.addEventListener(() => {
            const now = performance.now() / 1000
            const delta = this.previousTime === undefined ? 0 : Math.min(now - this.previousTime, .1)
            this.previousTime = now
            if (!this.show) return
            this.material.uniforms.time += delta * this.material.uniforms.animationSpeed
            this.reflectionPass.render([...group])
            this.material.uniforms.reflectionReady = this.reflectionPass.ready ? 1 : 0
            Matrix4.toArray(this.reflectionPass.matrix, this.material.uniforms.reflectionMatrix)
            const u = this.material.uniforms
            this.underwaterPass.enabled = u.refraction > 0 || u.foam > 0 || (u.debugView > 0 && u.debugView < 3.5)
            this.underwaterPass.clipMargin = u.waveHeight + .05
            this.underwaterPass.render([...group])
            u.underwaterReady = this.underwaterPass.ready ? 1 : 0
            Matrix4.toArray(this.underwaterPass.matrix, u.underwaterMatrix)
            Matrix4.toArray(this.underwaterPass.inverseMatrix, u.underwaterInverseMatrix)
        }))
        this.own(scene.preUpdate.addEventListener(() => {
            if (this.show && this.material.uniforms.animationSpeed !== 0) this.requestRender()
        }))
        this.requestRender()
    }

    /** 原地更新样式，无需重建图元或反射纹理。 */
    update(options: WaterStyleOptions): void {
        this.assertAlive()
        validateStyle(options)
        const { color, reflection, skyReflection, sunColor, refraction, absorption, foam, debugView, ...uniforms } = options
        for (const [key, value] of Object.entries(uniforms)) {
            if (value !== undefined) this.material.uniforms[key] = value
        }
        if (color) this.material.uniforms.baseWaterColor = Color.clone(color)
        if (sunColor) this.material.uniforms.sunColor = Color.clone(sunColor)
        if (absorption) this.material.uniforms.absorption = Cartesian3.clone(absorption)
        if (refraction !== undefined) this.material.uniforms.refraction = refraction ? 1 : 0
        if (foam !== undefined) this.material.uniforms.foam = foam ? 1 : 0
        if (debugView !== undefined) this.material.uniforms.debugView = debugViews.indexOf(debugView)
        if (reflection !== undefined) this.reflectionPass.enabled = reflection
        if (skyReflection !== undefined) this.reflectionPass.skyReflection = skyReflection
        this.requestRender()
    }

    get show(): boolean { return this.primitive.show }
    set show(value: boolean) { this.assertAlive(); this.primitive.show = value; this.previousTime = undefined; this.requestRender() }

    override destroy(): void {
        if (this.destroyed) return
        super.destroy()
        if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.primitive)
        this.material.destroy()
        this.reflectionPass.destroy()
        this.underwaterPass.destroy()
    }
}

const debugViews = ['surface', 'depth', 'refraction', 'foam', 'normals'] as const
function validateStyle(options: WaterStyleOptions): void {
    if (options.debugView !== undefined && !debugViews.includes(options.debugView)) throw new RangeError('debugView 无效。')
    if (options.absorption && [options.absorption.x, options.absorption.y, options.absorption.z].some(v => !Number.isFinite(v) || v < 0)) throw new RangeError('absorption 必须是非负有限 RGB 系数。')
    for (const key of ['refractionStrength', 'foamWidth', 'foamOpacity', 'depthRange', 'waveHeight', 'waveSteepness', 'shoreFadeDistance', 'frequency', 'animationSpeed', 'amplitude', 'specularIntensity', 'distortionScale', 'reflectionStrength', 'waveLength', 'rippleStrength', 'roughness', 'scattering', 'waveDirection'] as const) {
        const value = options[key]
        if (value !== undefined && (!Number.isFinite(value) || (key !== 'waveDirection' && value < 0) ||
            (key === 'reflectionStrength' && value > 1) || (key === 'waveLength' && value <= 0) ||
            (key === 'waveHeight' && value > 10) || (key === 'waveSteepness' && value > 1) ||
            ((key === 'refractionStrength' || key === 'foamOpacity') && value > 1) ||
            ((key === 'foamWidth' || key === 'depthRange') && value <= 0) ||
            (key === 'roughness' && (value < .03 || value > 1)))) {
            throw new RangeError(`${key} 超出有效范围。`)
        }
    }
}
