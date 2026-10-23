import {
    Camera, Cartesian3, Color, ColorGeometryInstanceAttribute, FrustumOutlineGeometry, GeometryInstance, Matrix3,
    Math as CesiumMath, PerInstanceColorAppearance, PerspectiveFrustum, PostProcessStage, Primitive, Quaternion,
} from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import { toCartesian } from '../../utils/coordinate/positions'
import type { VisualizationHost, VisualizationPosition } from '../types'
import { createProjectionShadow, createVideoTexture, projectionUniforms } from './base/cesiumProjection'
import shader from './base/projectionShader'

export interface VideoProjectionOptions {
    position: VisualizationPosition
    /** 投影相机的航向、俯仰、横滚，单位：度。 */
    heading?: number
    pitch?: number
    roll?: number
    near?: number
    far?: number
    fov?: number
    aspectRatio?: number
    alpha?: number
    debugFrustum?: boolean
    textureSize?: number
    show?: boolean
}

/** 借助深度和投影阴影贴图投射视频；视频元素及其播放由调用方管理。 */
export class VideoProjection extends OwnedResource {
    private options: VideoProjectionOptions
    private shadow: any
    private texture: any
    private stage?: PostProcessStage
    private frustum?: Primitive
    private readonly primitive: {
        update: (state: any) => void
        isDestroyed: () => boolean
        destroy: () => void
    }
    private visible: boolean
    private lastVideoTime = -1
    private videoWidth = 0
    private videoHeight = 0

    constructor(host: VisualizationHost, readonly video: HTMLVideoElement, options: VideoProjectionOptions) {
        VideoProjection.validate(options)
        super(host)
        this.options = {
            heading: 0,
            pitch: -45,
            roll: 0,
            near: .1,
            far: 240,
            fov: 40,
            aspectRatio: 1,
            alpha: 1,
            textureSize: 1024,
            debugFrustum: false,
            ...options
        }
        this.visible = options.show ?? true
        this.primitive = {
            update: state => {
                if (this.visible && this.texture && this.shadow) state.shadowMaps.push(this.shadow)
            },
            isDestroyed: () => this.destroyed,
            destroy: () => this.destroy()
        }
        try {
            this.configure()
            this.viewer.scene.primitives.add(this.primitive)
            this.own(this.viewer.scene.preUpdate.addEventListener(() => this.updateVideo()))
            const invalidate = () => {
                this.lastVideoTime = -1
                this.requestRender()
            }
            this.video.addEventListener('loadeddata', invalidate)
            this.own(() => this.video.removeEventListener('loadeddata', invalidate))
        } catch (error) {
            this.destroy()
            throw error
        }
        this.requestRender()
    }

    get show(): boolean {
        return this.visible
    }

    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        if (this.stage) this.stage.enabled = value && !!this.texture
        if (this.frustum) this.frustum.show = value && !!this.options.debugFrustum
        this.requestRender()
    }

    setOptions(options: Partial<VideoProjectionOptions>): void {
        this.assertAlive()
        const next = { ...this.options, ...options }
        VideoProjection.validate(next)
        this.options = next
        this.configure()
        this.requestRender()
    }

    private static validate(options: VideoProjectionOptions): void {
        toCartesian(options.position)
        const near = options.near ?? .1, far = options.far ?? 240, fov = options.fov ?? 40, aspect = options.aspectRatio ?? 1, alpha = options.alpha ?? 1, size = options.textureSize ?? 1024
        if (![near, far, fov, aspect, alpha, options.heading ?? 0, options.pitch ?? -45, options.roll ?? 0].every(Number.isFinite) || near <= 0 || far <= near || fov <= 0 || fov >= 180 || aspect <= 0 || alpha < 0 || alpha > 1 || !Number.isInteger(size) || size < 128 || size > 4096 || (size & (size - 1)) !== 0) throw new RangeError('Invalid video projection camera, alpha or texture size.')
    }

    private configure(): void {
        const camera = new Camera(this.viewer.scene)
        camera.setView({
            destination: toCartesian(this.options.position),
            orientation: {
                heading: CesiumMath.toRadians(this.options.heading!),
                pitch: CesiumMath.toRadians(this.options.pitch!),
                roll: CesiumMath.toRadians(this.options.roll!)
            }
        })
        camera.frustum = new PerspectiveFrustum({
            near: this.options.near,
            far: this.options.far,
            fov: CesiumMath.toRadians(this.options.fov!),
            aspectRatio: this.options.aspectRatio
        })
        const shadow = createProjectionShadow(this.viewer.scene, camera, this.options.textureSize!)
        let stage: PostProcessStage
        let frustum: Primitive
        try {
            stage = new PostProcessStage({
                fragmentShader: shader,
                uniforms: projectionUniforms(shadow, () => this.texture, () => this.options.alpha!)
            })
            stage.enabled = this.visible && !!this.texture
            // 视锥几何以 Z 轴朝向前方，X 轴与相机右方向相反。
            const rotation = new Matrix3()
            Matrix3.setColumn(rotation, 0, Cartesian3.negate(camera.rightWC, new Cartesian3()), rotation)
            Matrix3.setColumn(rotation, 1, camera.upWC, rotation)
            Matrix3.setColumn(rotation, 2, camera.directionWC, rotation)
            frustum = new Primitive({
                geometryInstances: new GeometryInstance({
                    geometry: new FrustumOutlineGeometry({
                        origin: camera.positionWC,
                        frustum: camera.frustum as PerspectiveFrustum,
                        orientation: Quaternion.fromRotationMatrix(rotation)
                    }),
                    attributes: { color: ColorGeometryInstanceAttribute.fromColor(Color.YELLOW) },
                }), appearance: new PerInstanceColorAppearance({ flat: true, translucent: false }), asynchronous: false, show: this.visible && !!this.options.debugFrustum
            })
        } catch (error) {
            shadow.destroy()
            throw error
        }
        if (this.stage) this.viewer.scene.postProcessStages.remove(this.stage)
        if (this.frustum) this.viewer.scene.primitives.remove(this.frustum)
        if (this.shadow && !this.shadow.isDestroyed()) this.shadow.destroy()
        this.shadow = shadow
        this.viewer.scene.postProcessStages.add(stage)
        this.stage = stage
        this.frustum = this.viewer.scene.primitives.add(frustum)
    }

    private updateVideo(): void {
        if (this.destroyed || !this.visible) return
        // 首帧或分辨率变化时创建纹理，其余帧复用纹理，避免每帧分配 GPU 资源。
        if (this.video.readyState >= 2 && this.video.videoWidth && this.video.videoHeight && (!this.texture || this.video.currentTime !== this.lastVideoTime || this.videoWidth !== this.video.videoWidth || this.videoHeight !== this.video.videoHeight)) {
            if (!this.texture || this.videoWidth !== this.video.videoWidth || this.videoHeight !== this.video.videoHeight) {
                this.texture?.destroy()
                this.texture = createVideoTexture(this.viewer.scene, this.video)
                this.videoWidth = this.video.videoWidth
                this.videoHeight = this.video.videoHeight
            } else this.texture.copyFrom({ source: this.video })
            this.lastVideoTime = this.video.currentTime
            this.stage!.enabled = true
            this.requestRender()
        }
        if (!this.video.paused && !this.video.ended) this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        // 先标记销毁状态；移除图元时 Cesium 会再次调用图元的 destroy。
        super.destroy()
        if (!this.viewer.isDestroyed()) {
            if (this.stage) this.viewer.scene.postProcessStages.remove(this.stage)
            if (this.frustum) this.viewer.scene.primitives.remove(this.frustum)
            this.viewer.scene.primitives.remove(this.primitive)
        }
        if (this.texture && !this.texture.isDestroyed()) this.texture.destroy()
        if (this.shadow && !this.shadow.isDestroyed()) this.shadow.destroy()
        this.stage = undefined
        this.frustum = undefined
        this.texture = undefined
        this.shadow = undefined
    }
}
