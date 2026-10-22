import {
    ArcType, Cartesian3, Color, ConstantPositionProperty, ConstantProperty, CustomDataSource,
    Entity, Event, Quaternion, Transforms,
    type PositionProperty, type Property,
} from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { prepareTrajectory, sampleTrajectory, type PreparedTrajectory } from './prepareTrajectory'
import type { TrajectoryFrame, TrajectoryOptions, TrajectorySample, TrajectoryState } from './types'

type ResolvedOptions = TrajectoryOptions & Required<Pick<TrajectoryOptions, 'speed' | 'multiplier' | 'loop' | 'showPath'>>

/** 通用对象轨迹播放器；独立计时，相机跟随由 camera/roaming 负责。 */
export class TrajectoryPlayer extends OwnedResource {
    readonly dataSource = new CustomDataSource('GeoEarth trajectory')
    readonly ready: Promise<void>
    readonly entity: Entity
    readonly stateChanged = new Event<(state: TrajectoryState) => void>()
    readonly updated = new Event<(frame: TrajectoryFrame) => void>()
    private readonly route: Entity
    private readonly currentPosition = new ConstantPositionProperty()
    private readonly currentOrientation = new ConstantProperty()
    private readonly originalPosition?: PositionProperty
    private readonly originalOrientation?: Property
    private readonly options: ResolvedOptions
    private readonly projection?: Entity
    private prepared?: PreparedTrajectory
    private elapsed = 0
    private lastFrame = 0
    private removeFrame?: () => void
    private currentState: TrajectoryState = 'idle'

    constructor(host: SceneHost, options: TrajectoryOptions = {}) {
        const resolved = {
            ...options,
            speed: options.speed ?? 10,
            multiplier: options.multiplier ?? 1,
            loop: options.loop ?? false,
            showPath: options.showPath ?? true,
        }
        TrajectoryPlayer.validateOptions(resolved)
        super(host)
        this.options = resolved
        this.entity = options.entity ?? this.dataSource.entities.add({
            model: options.model,
            label: options.label,
            point: options.model ? undefined : { pixelSize: 9, color: Color.YELLOW },
        })
        this.originalPosition = this.entity.position
        this.originalOrientation = this.entity.orientation
        this.entity.position = this.currentPosition
        this.entity.orientation = this.currentOrientation
        this.route = this.dataSource.entities.add({
            show: resolved.showPath,
            polyline: {
                positions: [], width: options.pathWidth ?? 3,
                material: options.pathMaterial ?? Color.CYAN, arcType: ArcType.NONE,
            },
        })
        if (options.projection) {
            this.projection = this.dataSource.entities.add({
                cylinder: {
                    length: options.projection.length ?? 200,
                    topRadius: options.projection.topRadius ?? 0,
                    bottomRadius: options.projection.bottomRadius ?? 240,
                    material: options.projection.color ?? Color.CYAN.withAlpha(.25),
                },
            })
        }
        this.ready = this.attachDataSource(this.dataSource)
    }

    get state(): TrajectoryState {
        return this.currentState
    }

    get duration(): number {
        return this.prepared?.duration ?? 0
    }

    get currentTime(): number {
        return this.elapsed
    }

    get progress(): number {
        return this.duration ? this.elapsed / this.duration : 0
    }

    get show(): boolean {
        return this.dataSource.show
    }

    set show(value: boolean) {
        this.assertAlive()
        this.dataSource.show = value
        this.requestRender()
    }

    get loop(): boolean {
        return this.options.loop
    }

    set loop(value: boolean) {
        this.assertAlive()
        this.options.loop = value
    }

    get showPath(): boolean {
        return this.options.showPath
    }

    set showPath(value: boolean) {
        this.assertAlive()
        this.options.showPath = value
        this.route.show = value
        this.requestRender()
    }

    /** 先校验新路线，再替换当前路线；无效输入不破坏正在使用的数据。 */
    setPath(samples: readonly TrajectorySample[]): void {
        this.assertAlive()
        const path = prepareTrajectory(samples, this.options.speed, this.viewer.scene.globe.ellipsoid)
        this.pause()
        this.prepared = path
        this.elapsed = 0
        this.route.polyline!.positions = new ConstantProperty(path.positions)
        this.route.polyline!.arcType = new ConstantProperty(path.geographic ? ArcType.GEODESIC : ArcType.NONE)
        this.setState('idle')
        this.updateEntity()
    }

    /** 调整无时间戳轨迹的米制速度并保持当前位置；时间戳轨迹仍按原时间表播放。 */
    setSpeed(speed: number): void {
        this.assertAlive()
        if (!Number.isFinite(speed) || speed <= 0) throw new RangeError('轨迹速度必须为正数。')
        this.tick()
        const ratio = this.options.speed / speed
        this.options.speed = speed
        if (this.prepared && !this.prepared.timed) {
            this.prepared.seconds = this.prepared.seconds.map(time => time * ratio)
            this.prepared.duration *= ratio
            this.elapsed *= ratio
        }
    }

    setMultiplier(value: number): void {
        this.assertAlive()
        if (!Number.isFinite(value) || value <= 0) throw new RangeError('播放倍率必须为正数。')
        this.tick()
        this.options.multiplier = value
    }

    play(): void {
        this.assertAlive()
        if (!this.prepared) throw new Error('请先设置轨迹，再开始播放。')
        if (this.currentState === 'playing') return
        if (this.elapsed >= this.duration) this.elapsed = 0
        this.lastFrame = performance.now()
        this.removeFrame = this.viewer.scene.preUpdate.addEventListener(() => this.tick())
        this.setState('playing')
        this.updateEntity()
    }

    pause(): void {
        this.assertAlive()
        this.removeFrame?.()
        this.removeFrame = undefined
        // 停在最近一次显示的位置；事件回调中暂停也不会再次触发位置更新。
        if (this.currentState === 'playing') this.setState('paused')
    }

    stop(): void {
        this.assertAlive()
        this.pause()
        this.elapsed = 0
        this.setState('idle')
        if (this.prepared) this.updateEntity()
    }

    seek(seconds: number): void {
        this.assertAlive()
        if (!this.prepared) throw new Error('请先设置轨迹，再跳转进度。')
        if (!Number.isFinite(seconds)) throw new RangeError('跳转时间必须为有限数值。')
        this.elapsed = Math.max(0, Math.min(seconds, this.duration))
        this.lastFrame = performance.now()
        this.updateEntity()
        if (this.elapsed >= this.duration) {
            this.pause()
            this.setState('completed')
        } else if (this.currentState === 'completed') {
            this.setState('paused')
        }
    }

    private tick(): void {
        if (this.currentState !== 'playing') return
        const now = performance.now()
        this.elapsed += Math.max(0, now - this.lastFrame) / 1000 * this.options.multiplier
        this.lastFrame = now
        const completed = this.elapsed >= this.duration && !this.options.loop
        this.elapsed = this.options.loop ? this.elapsed % this.duration : Math.min(this.elapsed, this.duration)
        this.updateEntity()
        if (completed && this.currentState === 'playing') {
            this.pause()
            this.setState('completed')
        }
    }

    private updateEntity(): void {
        const path = this.prepared!
        const position = sampleTrajectory(path, this.elapsed)
        this.currentPosition.setValue(position)
        this.updateTrail(path, position)
        // 用前后采样点求切向方向；端点使用单侧方向，避免朝向突然归零。
        const before = sampleTrajectory(path, Math.max(0, this.elapsed - .01))
        const after = sampleTrajectory(path, Math.min(this.duration, this.elapsed + .01))
        const tangent = Cartesian3.subtract(after, before, new Cartesian3())
        let direction: Cartesian3 | undefined
        if (Cartesian3.magnitudeSquared(tangent) > 1e-12) {
            direction = Cartesian3.normalize(tangent, tangent)
            const rotation = Transforms.rotationMatrixFromPositionVelocity(position, direction, this.viewer.scene.globe.ellipsoid)
            this.currentOrientation.setValue(Quaternion.fromRotationMatrix(rotation))
        }
        if (this.projection) {
            const up = this.viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(position, new Cartesian3())
            const offset = Cartesian3.multiplyByScalar(up, (this.options.projection!.length ?? 200) / 2, up)
            this.projection.position = new ConstantPositionProperty(Cartesian3.subtract(position, offset, new Cartesian3()))
        }
        this.requestRender()
        this.updated.raiseEvent({ position, direction, time: this.elapsed })
    }

    private updateTrail(path: PreparedTrajectory, position: Cartesian3): void {
        if (this.options.trailTime === undefined) return
        const start = Math.max(0, this.elapsed - this.options.trailTime)
        const positions = [sampleTrajectory(path, start)]
        path.seconds.forEach((time, index) => {
            if (time > start && time < this.elapsed) positions.push(path.positions[index])
        })
        positions.push(position)
        this.route.polyline!.positions = new ConstantProperty(positions)
    }

    private setState(state: TrajectoryState): void {
        if (this.currentState === state) return
        this.currentState = state
        this.stateChanged.raiseEvent(state)
    }

    private static validateOptions(options: ResolvedOptions): void {
        for (const value of [options.speed, options.multiplier, options.pathWidth ?? 3]) {
            if (!Number.isFinite(value) || value <= 0) throw new RangeError('轨迹速度、播放倍率和线宽必须为正数。')
        }
        if (options.trailTime !== undefined && (!Number.isFinite(options.trailTime) || options.trailTime <= 0)) {
            throw new RangeError('尾迹时长必须为正数。')
        }
        if (options.projection) {
            const { length = 200, topRadius = 0, bottomRadius = 240 } = options.projection
            if (![length, topRadius, bottomRadius].every(Number.isFinite) || length <= 0 || topRadius < 0 || bottomRadius < 0) {
                throw new RangeError('投影柱体长度必须为正数，半径不能为负数。')
            }
        }
    }

    override destroy(): void {
        if (this.destroyed) return
        this.removeFrame?.()
        this.removeFrame = undefined
        // 借用的实体归调用方；若调用方已经替换属性，则保留它的最新修改。
        if (this.options.entity) {
            if (this.entity.position === this.currentPosition) this.entity.position = this.originalPosition
            if (this.entity.orientation === this.currentOrientation) this.entity.orientation = this.originalOrientation
        }
        if (!this.viewer.isDestroyed()) this.viewer.dataSources.remove(this.dataSource, true)
        this.prepared = undefined
        super.destroy()
    }
}
