import {
    Cartesian3, Color, ConstantPositionProperty, ConstantProperty, HeadingPitchRange,
    ModelGraphics, PointGraphics, Quaternion, Matrix4, Math as CesiumMath, SceneMode, Transforms, type Entity, type Viewer,
} from 'cesium'
import type { DrawTool } from '../../tools/draw/DrawTool'
import { CoordinateType } from '../../tools/draw/types'
import type { WorldDegree } from '../../viewer/types'
import { preparePath, validatePath } from './preparePath'
import type { PathRoamingOptions, PrepareRoamingPathOptions, RoamingState, RoamingView } from './types'

type ResolvedOptions = Required<Omit<PathRoamingOptions, 'model'>> & Pick<PathRoamingOptions, 'model'>

/** Independent elapsed time: does not modify Viewer.clock or trackedEntity. */
export class PathRoaming {
    private options: ResolvedOptions
    private points: WorldDegree[] = []
    private positions: Cartesian3[] = []
    private distances: number[] = []
    private pathEntity?: Entity
    private marker?: Entity
    private removeFrame?: () => void
    private previousInputs?: boolean
    private previousTransform?: Matrix4
    private lastFrame = 0
    private traveled = 0
    private currentState: RoamingState = 'idle'
    private destroyed = false
    private taskId = 0
    private pendingDraw?: DrawTool
    private removeDrawListener?: () => void

    constructor(private readonly viewer: Viewer, options: PathRoamingOptions = {}, private readonly beforeStart?: () => void) {
        this.options = this.resolveOptions(options)
    }

    get state(): RoamingState { return this.currentState }
    get progress(): number { return this.length ? this.traveled / this.length : 0 }
    get duration(): number { return this.length / this.options.speed }
    get path(): WorldDegree[] { return this.points.map(point => ({ ...point })) }
    private get length(): number { return this.distances[this.distances.length - 1] ?? 0 }

    setPath(path: readonly WorldDegree[]): void {
        this.assertAlive()
        const points = validatePath(path)
        const positions = points.map(point => Cartesian3.fromDegrees(point.longitude, point.latitude, point.height, this.viewer.scene.globe.ellipsoid))
        const unique = positions.filter((point, index) => !index || Cartesian3.distance(point, positions[index - 1]) > 1e-6)
        if (unique.length < 2) throw new RangeError('The roaming path must have a non-zero length')
        this.stop()
        this.points = unique.map(point => {
            const p = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(point)
            return { longitude: CesiumMath.toDegrees(p.longitude), latitude: CesiumMath.toDegrees(p.latitude), height: p.height }
        })
        this.positions = unique
        this.distances = [0]
        for (let i = 1; i < unique.length; i++) this.distances.push(this.distances[i - 1] + Cartesian3.distance(unique[i - 1], unique[i]))
        this.removeEntities()
        this.pathEntity = this.viewer.entities.add({
            polyline: { positions: unique, width: 3, material: Color.CYAN }, show: this.options.showPath,
        })
        this.marker = this.viewer.entities.add({
            position: unique[0],
            ...(this.options.model ? { model: this.options.model } : { point: { pixelSize: 10, color: Color.YELLOW, outlineColor: Color.BLACK, outlineWidth: 1 } }),
        })
        this.viewer.scene.requestRender()
    }

    /** Prepare ground/model heights first, then commit atomically. Superseded tasks return false. */
    async preparePath(path: readonly WorldDegree[], options: PrepareRoamingPathOptions = {}): Promise<boolean> {
        this.assertAlive()
        this.stop()
        const task = ++this.taskId
        const result = await preparePath(this.viewer, path, options, [this.marker, this.pathEntity].filter(Boolean))
        if (this.destroyed || task !== this.taskId) return false
        this.setPath(result)
        return true
    }

    /** Reuses DrawTool; right-click finishes with enough points, otherwise cancels. */
    async drawPath(draw: DrawTool, options: PrepareRoamingPathOptions = {}): Promise<boolean> {
        this.assertAlive()
        this.stop()
        const task = ++this.taskId
        try {
            // Starting a draw cancels its previous session synchronously. Only observe
            // activeChanged after that cancellation, so we retain ownership of ours.
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
        if (this.positions.length < 2) throw new Error('Set a roaming path before starting')
        if (this.viewer.scene.mode !== SceneMode.SCENE3D) throw new Error('Path roaming requires a 3D scene')
        if (this.viewer.trackedEntity) throw new Error('Release trackedEntity before starting path roaming')
        const resolved = this.resolveOptions({ ...this.options, ...options })
        this.beforeStart?.()
        this.stop()
        this.options = resolved
        if (this.marker) {
            this.marker.model = resolved.model ? new ModelGraphics(resolved.model) : undefined
            this.marker.point = resolved.model ? undefined : new PointGraphics({ pixelSize: 10, color: Color.YELLOW })
        }
        if (this.pathEntity) this.pathEntity.show = resolved.showPath
        this.traveled = 0
        this.begin()
    }

    pause(): void {
        if (this.currentState !== 'playing') return
        this.removeFrame?.()
        this.removeFrame = undefined
        this.releaseCamera()
        this.currentState = 'paused'
    }

    resume(): void {
        this.assertAlive()
        if (this.currentState !== 'paused') return
        if (this.viewer.scene.mode !== SceneMode.SCENE3D || this.viewer.trackedEntity) throw new Error('Resume requires a free camera in 3D')
        this.beforeStart?.()
        this.begin()
    }

    stop(): void {
        if (this.destroyed) return
        ++this.taskId
        const draw = this.pendingDraw
        this.releaseDraw()
        draw?.cancel()
        this.pause()
        this.traveled = 0
        this.currentState = 'idle'
        if (this.marker && !this.viewer.isDestroyed()) {
            (this.marker.position as ConstantPositionProperty).setValue(this.positions[0])
            this.viewer.scene.requestRender()
        }
    }

    setMultiplier(multiplier: number): void {
        this.assertAlive()
        if (!Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError('multiplier must be positive')
        this.options.multiplier = multiplier
    }

    setView(view: RoamingView): void {
        this.assertAlive()
        if (!['thirdPerson', 'firstPerson', 'none'].includes(view)) throw new RangeError('Invalid roaming view')
        const playing = this.currentState === 'playing'
        this.pause()
        this.options.view = view
        if (playing) this.resume()
    }

    setShowPath(show: boolean): void {
        this.assertAlive()
        this.options.showPath = show
        if (this.pathEntity) this.pathEntity.show = show
        this.viewer.scene.requestRender()
    }

    destroy(): void {
        if (this.destroyed) return
        this.stop()
        this.removeEntities()
        this.points = []
        this.positions = []
        this.distances = []
        this.destroyed = true
    }

    private begin(): void {
        this.currentState = 'playing'
        this.lastFrame = performance.now()
        if (this.options.view !== 'none') {
            this.previousInputs = this.viewer.scene.screenSpaceCameraController.enableInputs
            this.previousTransform = Matrix4.clone(this.viewer.camera.transform)
            this.viewer.scene.screenSpaceCameraController.enableInputs = false
        }
        try { this.updateView() }
        catch (error) { this.pause(); throw error }
        this.removeFrame = this.viewer.scene.preUpdate.addEventListener(() => {
            if (this.viewer.scene.mode !== SceneMode.SCENE3D) { this.pause(); return }
            const now = performance.now()
            this.traveled += Math.max(0, now - this.lastFrame) / 1000 * this.options.speed * this.options.multiplier
            this.lastFrame = now
            const ended = this.traveled >= this.length && !this.options.loop
            this.traveled = this.options.loop ? this.traveled % this.length : Math.min(this.traveled, this.length)
            try { this.updateView() }
            catch (error) { this.pause(); throw error }
            if (ended) { this.pause(); this.currentState = 'completed' }
        })
        this.viewer.scene.requestRender()
    }

    private positionAt(distance: number): Cartesian3 {
        let index = 1
        while (index < this.distances.length - 1 && this.distances[index] < distance) index++
        const fraction = CesiumMath.clamp((distance - this.distances[index - 1]) / (this.distances[index] - this.distances[index - 1]), 0, 1)
        return Cartesian3.lerp(this.positions[index - 1], this.positions[index], fraction, new Cartesian3())
    }

    private updateView(): void {
        const position = this.positionAt(this.traveled)
        const ahead = this.positionAt(Math.min(this.length, this.traveled + 1))
        const behind = this.positionAt(Math.max(0, this.traveled - 1))
        const direction = Cartesian3.subtract(ahead, behind, new Cartesian3())
        if (Cartesian3.magnitudeSquared(direction) < 1e-12) Cartesian3.subtract(ahead, position, direction)
        if (Cartesian3.magnitudeSquared(direction) < 1e-12) return
        Cartesian3.normalize(direction, direction)
        const transform = Transforms.eastNorthUpToFixedFrame(position, this.viewer.scene.globe.ellipsoid)
        const local = Matrix4.multiplyByPointAsVector(Matrix4.inverseTransformation(transform, new Matrix4()), direction, new Cartesian3())
        const heading = Math.atan2(local.x, local.y)
        const markerPosition = this.marker!.position as ConstantPositionProperty
        markerPosition.setValue(position)
        this.marker!.orientation = new ConstantProperty(Quaternion.fromRotationMatrix(Transforms.rotationMatrixFromPositionVelocity(position, direction, this.viewer.scene.globe.ellipsoid)))
        if (this.options.view === 'thirdPerson') {
            this.viewer.camera.lookAt(position, new HeadingPitchRange(heading, CesiumMath.toRadians(this.options.pitch), this.options.range))
        } else if (this.options.view === 'firstPerson') {
            this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
            const up = this.viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(position, new Cartesian3())
            const destination = Cartesian3.add(position, Cartesian3.multiplyByScalar(up, this.options.eyeHeight, new Cartesian3()), new Cartesian3())
            // HPR also handles vertical route segments without a degenerate direction/up basis.
            this.viewer.camera.setView({ destination, orientation: { heading, pitch: Math.atan2(local.z, Math.hypot(local.x, local.y)), roll: 0 } })
        }
        this.viewer.scene.requestRender()
    }

    private releaseCamera(): void {
        if (this.viewer.isDestroyed()) { this.previousTransform = undefined; this.previousInputs = undefined; return }
        if (this.previousTransform) this.viewer.camera.lookAtTransform(this.previousTransform)
        if (this.previousInputs !== undefined) this.viewer.scene.screenSpaceCameraController.enableInputs = this.previousInputs
        this.previousTransform = undefined
        this.previousInputs = undefined
        this.viewer.scene.requestRender()
    }

    private releaseDraw(): void {
        this.pendingDraw = undefined
        this.removeDrawListener?.()
        this.removeDrawListener = undefined
    }

    private removeEntities(): void {
        if (!this.viewer.isDestroyed()) {
            if (this.pathEntity) this.viewer.entities.remove(this.pathEntity)
            if (this.marker) this.viewer.entities.remove(this.marker)
        }
        this.pathEntity = undefined
        this.marker = undefined
    }

    private resolveOptions(options: PathRoamingOptions): ResolvedOptions {
        const result: ResolvedOptions = {
            speed: options.speed ?? 10, multiplier: options.multiplier ?? 1, loop: options.loop ?? false,
            showPath: options.showPath ?? true, view: options.view ?? 'thirdPerson', pitch: options.pitch ?? -30,
            range: options.range ?? 100, eyeHeight: options.eyeHeight ?? 1.7, model: options.model && { ...options.model },
        }
        for (const key of ['speed', 'multiplier', 'range'] as const) if (!Number.isFinite(result[key]) || result[key] <= 0) throw new RangeError(`${key} must be positive`)
        if (!Number.isFinite(result.pitch) || result.pitch <= -90 || result.pitch >= 0) throw new RangeError('pitch must be between -90 and 0 degrees')
        if (!Number.isFinite(result.eyeHeight) || result.eyeHeight < 0) throw new RangeError('eyeHeight must not be negative')
        if (!['thirdPerson', 'firstPerson', 'none'].includes(result.view)) throw new RangeError('Invalid roaming view')
        if (result.model && (!result.model.uri?.trim() || (result.model.scale !== undefined && (!Number.isFinite(result.model.scale) || result.model.scale <= 0)))) throw new RangeError('Invalid roaming model')
        return result
    }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('PathRoaming has been destroyed')
    }
}
