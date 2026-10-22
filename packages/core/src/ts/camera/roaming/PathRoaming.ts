import {
    Cartesian3, Color, HeadingPitchRange, Matrix4, Math as CesiumMath,
    ModelGraphics, PointGraphics, SceneMode, Transforms, type Viewer,
} from 'cesium'
import type { DrawTool } from '../../tools/draw/DrawTool'
import { CoordinateType } from '../../tools/draw/types'
import { TrajectoryPlayer, type TrajectoryFrame } from '../../tools/trajectory/index'
import type { WorldDegree } from '../../viewer/types'
import { preparePath, validatePath } from './preparePath'
import type { PathRoamingOptions, PrepareRoamingPathOptions, RoamingState, RoamingView } from './types'

type ResolvedOptions = Required<Omit<PathRoamingOptions, 'model'>> & Pick<PathRoamingOptions, 'model'>

/** 路径漫游：复用轨迹工具驱动对象，仅在本类管理路线准备与相机控制。 */
export class PathRoaming {
    private options: ResolvedOptions
    private points: WorldDegree[] = []
    private player?: TrajectoryPlayer
    private previousInputs?: boolean
    private previousTransform?: Matrix4
    private destroyed = false
    private taskId = 0
    private pendingDraw?: DrawTool
    private removeDrawListener?: () => void

    constructor(private readonly viewer: Viewer, options: PathRoamingOptions = {}, private readonly beforeStart?: () => void) {
        this.options = this.resolveOptions(options)
    }

    get state(): RoamingState { return this.player?.state ?? 'idle' }
    get progress(): number { return this.player?.progress ?? 0 }
    get duration(): number { return this.player?.duration ?? 0 }
    get path(): WorldDegree[] { return this.points.map(point => ({ ...point })) }

    setPath(path: readonly WorldDegree[]): void {
        this.assertAlive()
        const ellipsoid = this.viewer.scene.globe.ellipsoid
        const positions = validatePath(path).map(point => Cartesian3.fromDegrees(point.longitude, point.latitude, point.height, ellipsoid))
        const unique = positions.filter((point, index) => !index || Cartesian3.distance(point, positions[index - 1]) > 1e-6)
        if (unique.length < 2) throw new RangeError('漫游路线至少需要两个不同的位置。')

        this.stop()
        this.player?.destroy()
        this.points = unique.map(point => {
            const position = ellipsoid.cartesianToCartographic(point)
            return {
                longitude: CesiumMath.toDegrees(position.longitude),
                latitude: CesiumMath.toDegrees(position.latitude),
                height: position.height,
            }
        })
        this.player = this.createPlayer(unique)
        this.updateMarker()
    }

    /** 先完成地形或模型表面采样，再提交新路线；被后续操作替代的任务返回 false。 */
    async preparePath(path: readonly WorldDegree[], options: PrepareRoamingPathOptions = {}): Promise<boolean> {
        this.assertAlive()
        this.stop()
        const task = ++this.taskId
        const exclude = this.player?.dataSource.entities.values ?? []
        const result = await preparePath(this.viewer, path, options, exclude)
        if (this.destroyed || task !== this.taskId) return false
        this.setPath(result)
        return true
    }

    /** 复用绘制工具采集路线；本类只取消自己发起的绘制会话。 */
    async drawPath(draw: DrawTool, options: PrepareRoamingPathOptions = {}): Promise<boolean> {
        this.assertAlive()
        this.stop()
        const task = ++this.taskId
        try {
            // 开始新绘制会同步取消旧会话，因此需要在开始之后监听会话结束。
            const result = draw.drawPolyLine({ coordinateType: CoordinateType.DEGREES })
            this.pendingDraw = draw
            this.removeDrawListener = draw.activeChanged.addEventListener(active => {
                if (!active) this.releaseDraw()
            })
            const points = await result
            if (this.destroyed || task !== this.taskId) return false
            return await this.preparePath(points, options)
        } finally {
            if (task === this.taskId) this.releaseDraw()
        }
    }

    start(options: PathRoamingOptions = {}): void {
        this.assertAlive()
        if (!this.player) throw new Error('请先设置漫游路线。')
        this.assertCameraAvailable()
        const resolved = this.resolveOptions({ ...this.options, ...options })
        this.beforeStart?.()
        this.stop()
        this.options = resolved
        this.player.setSpeed(resolved.speed)
        this.player.setMultiplier(resolved.multiplier)
        this.player.loop = resolved.loop
        this.player.showPath = resolved.showPath
        this.updateMarker()
        this.begin()
    }

    pause(): void {
        if (this.state === 'playing') this.player!.pause()
    }

    resume(): void {
        this.assertAlive()
        if (this.state !== 'paused') return
        this.assertCameraAvailable()
        this.beforeStart?.()
        this.begin()
    }

    stop(): void {
        if (this.destroyed) return
        ++this.taskId
        const draw = this.pendingDraw
        this.releaseDraw()
        draw?.cancel()
        this.player?.stop()
    }

    setMultiplier(multiplier: number): void {
        this.assertAlive()
        if (!Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError('播放倍率必须为正数。')
        this.player?.setMultiplier(multiplier)
        this.options.multiplier = multiplier
    }

    setView(view: RoamingView): void {
        this.assertAlive()
        if (!['thirdPerson', 'firstPerson', 'none'].includes(view)) throw new RangeError('无效的漫游视角。')
        const playing = this.state === 'playing'
        this.pause()
        this.options.view = view
        if (playing) this.resume()
    }

    setShowPath(show: boolean): void {
        this.assertAlive()
        this.options.showPath = show
        if (this.player) this.player.showPath = show
    }

    private createPlayer(positions: Cartesian3[]): TrajectoryPlayer {
        const player = new TrajectoryPlayer(this.viewer, {
            speed: this.options.speed,
            multiplier: this.options.multiplier,
            loop: this.options.loop,
            showPath: this.options.showPath,
            model: this.options.model,
        })
        // 保留原漫游的空间直线插值；地表路线的加密与采样由 preparePath 提前完成。
        player.setPath(positions.map(position => ({ position })))
        player.updated.addEventListener(frame => {
            if (player.state !== 'playing') return
            if (this.viewer.scene.mode !== SceneMode.SCENE3D) {
                this.pause()
                return
            }
            try {
                this.updateCamera(frame)
            } catch (error) {
                this.pause()
                throw error
            }
        })
        player.stateChanged.addEventListener(state => {
            if (state !== 'playing') this.releaseCamera()
        })
        return player
    }

    private updateMarker(): void {
        const marker = this.player!.entity
        marker.model = this.options.model ? new ModelGraphics(this.options.model) : undefined
        marker.point = this.options.model ? undefined : new PointGraphics({
            pixelSize: 10, color: Color.YELLOW, outlineColor: Color.BLACK, outlineWidth: 1,
        })
    }

    private begin(): void {
        if (this.options.view !== 'none') {
            this.previousInputs = this.viewer.scene.screenSpaceCameraController.enableInputs
            this.previousTransform = Matrix4.clone(this.viewer.camera.transform)
            this.viewer.scene.screenSpaceCameraController.enableInputs = false
        }
        try {
            this.player!.play()
        } catch (error) {
            this.pause()
            this.releaseCamera()
            throw error
        }
    }

    private updateCamera({ position, direction }: TrajectoryFrame): void {
        if (this.options.view === 'none' || !direction) return
        const ellipsoid = this.viewer.scene.globe.ellipsoid
        const transform = Transforms.eastNorthUpToFixedFrame(position, ellipsoid)
        const inverse = Matrix4.inverseTransformation(transform, new Matrix4())
        const local = Matrix4.multiplyByPointAsVector(inverse, direction, new Cartesian3())
        const heading = Math.atan2(local.x, local.y)

        if (this.options.view === 'thirdPerson') {
            this.viewer.camera.lookAt(position, new HeadingPitchRange(heading, CesiumMath.toRadians(this.options.pitch), this.options.range))
        } else {
            this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
            const up = ellipsoid.geodeticSurfaceNormal(position, new Cartesian3())
            const eyeOffset = Cartesian3.multiplyByScalar(up, this.options.eyeHeight, new Cartesian3())
            const destination = Cartesian3.add(position, eyeOffset, new Cartesian3())
            // 使用局部航向和俯仰，垂直路段也能得到稳定视角。
            this.viewer.camera.setView({
                destination,
                orientation: { heading, pitch: Math.atan2(local.z, Math.hypot(local.x, local.y)), roll: 0 },
            })
        }
    }

    /** 暂停、结束和销毁都归还相机输入及原参考坐标系。 */
    private releaseCamera(): void {
        if (!this.viewer.isDestroyed()) {
            if (this.previousTransform) this.viewer.camera.lookAtTransform(this.previousTransform)
            if (this.previousInputs !== undefined) this.viewer.scene.screenSpaceCameraController.enableInputs = this.previousInputs
            this.viewer.scene.requestRender()
        }
        this.previousTransform = undefined
        this.previousInputs = undefined
    }

    private releaseDraw(): void {
        this.pendingDraw = undefined
        this.removeDrawListener?.()
        this.removeDrawListener = undefined
    }

    private resolveOptions(options: PathRoamingOptions): ResolvedOptions {
        const result: ResolvedOptions = {
            speed: options.speed ?? 10,
            multiplier: options.multiplier ?? 1,
            loop: options.loop ?? false,
            showPath: options.showPath ?? true,
            view: options.view ?? 'thirdPerson',
            pitch: options.pitch ?? -30,
            range: options.range ?? 100,
            eyeHeight: options.eyeHeight ?? 1.7,
            model: options.model && { ...options.model },
        }
        for (const key of ['speed', 'multiplier', 'range'] as const) {
            if (!Number.isFinite(result[key]) || result[key] <= 0) throw new RangeError(`${key} 必须为正数。`)
        }
        if (!Number.isFinite(result.pitch) || result.pitch <= -90 || result.pitch >= 0) throw new RangeError('俯仰角必须在 -90 到 0 度之间。')
        if (!Number.isFinite(result.eyeHeight) || result.eyeHeight < 0) throw new RangeError('视点高度不能为负数。')
        if (!['thirdPerson', 'firstPerson', 'none'].includes(result.view)) throw new RangeError('无效的漫游视角。')
        if (result.model && (!result.model.uri?.trim() || (result.model.scale !== undefined && (!Number.isFinite(result.model.scale) || result.model.scale <= 0)))) {
            throw new RangeError('模型地址不能为空，模型比例必须为正数。')
        }
        return result
    }

    private assertCameraAvailable(): void {
        if (this.viewer.scene.mode !== SceneMode.SCENE3D) throw new Error('路径漫游需要三维场景。')
        if (this.viewer.trackedEntity) throw new Error('开始漫游前，请先解除 trackedEntity 跟踪。')
    }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('路径漫游已销毁。')
    }

    destroy(): void {
        if (this.destroyed) return
        this.stop()
        this.player?.destroy()
        this.player = undefined
        this.points = []
        this.destroyed = true
    }
}
