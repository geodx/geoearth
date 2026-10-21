import { Cartesian2, Cartesian3, HeadingPitchRange, Rectangle, Math as CesiumMath, type Viewer } from 'cesium'
import type { CameraEvent } from '../events/modules/CameraEvent'
import type { WorldDegree, WorldRectangle } from '../viewer/types'
import type { CameraView, CameraFlyToOptions } from './types'

/** Bound to one Viewer. Public angles are degrees; distances are meters. */
export class CameraManager {
    private readonly initialView: CameraView
    private settleFlight?: (completed: boolean) => void
    private previousEnableTilt?: boolean
    private destroyed = false
    private operationId = 0
    private targetPending = false

    constructor(
        private readonly viewer: Viewer,
        private readonly events: CameraEvent,
        private readonly beforeControl?: () => void
    ) {
        this.initialView = this.getView()
    }

    getView(): CameraView {
        this.assertAlive()
        const camera = this.viewer.camera
        const position = camera.positionCartographic
        return {
            longitude: CesiumMath.toDegrees(position.longitude),
            latitude: CesiumMath.toDegrees(position.latitude),
            height: position.height,
            heading: CesiumMath.toDegrees(camera.heading),
            pitch: CesiumMath.toDegrees(camera.pitch),
            roll: CesiumMath.toDegrees(camera.roll)
        }
    }

    /** Ellipsoid height, not height above terrain. */
    getHeight(): number {
        return this.getView().height
    }

    /** Intersection of the screen-center ray with the globe (including loaded terrain). */
    getCenter(): WorldDegree | undefined {
        this.assertAlive()
        const { scene, camera } = this.viewer
        const ray = camera.getPickRay(new Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2))
        const point = ray && scene.globe?.pick(ray, scene)
        if (!point) return undefined
        const position = scene.globe.ellipsoid.cartesianToCartographic(point)
        return {
            longitude: CesiumMath.toDegrees(position.longitude),
            latitude: CesiumMath.toDegrees(position.latitude),
            height: position.height
        }
    }

    /** Approximate ellipsoid view rectangle in degrees; west > east crosses the date line. */
    getExtent(): WorldRectangle | undefined {
        this.assertAlive()
        const rectangle = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe?.ellipsoid)
        if (!rectangle) return undefined
        return {
            west: CesiumMath.toDegrees(rectangle.west),
            south: CesiumMath.toDegrees(rectangle.south),
            east: CesiumMath.toDegrees(rectangle.east),
            north: CesiumMath.toDegrees(rectangle.north)
        }
    }

    setView(view: CameraView): void {
        this.validate(view)
        const operation = this.prepareControl()
        if (operation !== this.operationId || this.destroyed) return
        this.viewer.camera.setView(this.toCesiumView(view))
        this.viewer.scene.requestRender()
    }

    /** Resolves true on completion, false on interruption or cancellation. */
    flyTo(options: CameraFlyToOptions): Promise<boolean> {
        this.validate(options)
        const duration = options.duration ?? 2
        if (!Number.isFinite(duration) || duration < 0) throw new RangeError('duration must be a non-negative number')
        return this.runFlight((complete, cancel) => {
            this.viewer.camera.flyTo({ ...this.toCesiumView(options), duration, complete, cancel })
        })
    }

    /** Fit a geographic rectangle. Bounds are degrees and may cross the date line. */
    flyToExtent(extent: WorldRectangle, duration = 2): Promise<boolean> {
        this.assertAlive()
        for (const key of ['west', 'south', 'east', 'north'] as const) {
            if (!Number.isFinite(extent[key])) throw new RangeError('Extent bounds must be finite')
        }
        if (extent.south < -90 || extent.north > 90 || extent.south > extent.north) {
            throw new RangeError('Invalid latitude bounds')
        }
        this.validateDuration(duration)
        return this.runFlight((complete, cancel) => {
            this.viewer.camera.flyTo({
                destination: Rectangle.fromDegrees(extent.west, extent.south, extent.east, extent.north),
                duration, complete, cancel
            })
        })
    }

    /** Fit a Cesium entity, data source, imagery layer, or tileset. */
    flyToTarget(target: Parameters<Viewer['flyTo']>[0], options: { duration?: number; heading?: number; pitch?: number; range?: number } = {}): Promise<boolean> {
        this.assertAlive()
        this.validateDuration(options.duration ?? 2)
        for (const key of ['heading', 'pitch', 'range'] as const) {
            if (options[key] !== undefined && !Number.isFinite(options[key])) throw new RangeError(`${key} must be finite`)
        }
        if ((options.range ?? 0) < 0) throw new RangeError('range must not be negative')
        return this.runFlight((complete, cancel, fail) => {
            this.targetPending = true
            this.viewer.flyTo(target, {
                duration: options.duration ?? 2,
                offset: new HeadingPitchRange(CesiumMath.toRadians(options.heading ?? 0), CesiumMath.toRadians(options.pitch ?? -90), options.range ?? 0)
            }).then(completed => completed ? complete() : cancel(), fail)
        })
    }

    private runFlight(start: (complete: () => void, cancel: () => void, fail: (error: unknown) => void) => void): Promise<boolean> {
        const operation = this.prepareControl()
        if (operation !== this.operationId || this.destroyed) return Promise.resolve(false)
        return new Promise<boolean>((resolve, reject) => {
            const settle = (completed: boolean) => {
                if (this.settleFlight !== settle) return
                this.settleFlight = undefined
                this.targetPending = false
                resolve(completed)
                if (completed) this.events.raiseFlyEnd()
                else this.events.raiseFlyCancel()
            }
            const fail = (error: unknown) => {
                if (this.settleFlight !== settle) return
                this.settleFlight = undefined
                this.targetPending = false
                reject(error)
                this.events.raiseFlyCancel()
            }
            this.settleFlight = settle
            try {
                this.events.raiseFlyStart()
                if (this.settleFlight !== settle) return
                start(() => settle(true), () => settle(false), fail)
            } catch (error) {
                fail(error)
            }
        })
    }

    cancelFlight(): void {
        this.assertAlive()
        ++this.operationId
        const settle = this.settleFlight
        this.beforeControl?.()
        this.cancelPendingTarget()
        this.viewer.camera.cancelFlight()
        settle?.(false)
    }

    /** Restore north without changing the camera position, pitch, or roll. */
    resetNorth(): void {
        this.setView({ ...this.getView(), heading: 0 })
    }

    /** Look down at the current globe center; return false when looking into space. */
    setTopView(): boolean {
        const center = this.getCenter()
        if (!center) return false
        const view = this.getView()
        this.setView({ ...center, height: Math.max(view.height, center.height + 1), heading: view.heading, pitch: -90, roll: 0 })
        return true
    }

    /** Explicit setter, rather than a toggle. Restores the previous tilt setting on unlock. */
    lockTopView(locked = true): boolean {
        this.assertAlive()
        const controller = this.viewer.scene.screenSpaceCameraController
        if (locked) {
            if (!this.setTopView()) return false
            this.previousEnableTilt ??= controller.enableTilt
            controller.enableTilt = false
        } else if (this.previousEnableTilt !== undefined) {
            controller.enableTilt = this.previousEnableTilt
            this.previousEnableTilt = undefined
        }
        return true
    }

    /** Restore the view captured when the manager was constructed. */
    reset(duration = 2): Promise<boolean> {
        return this.flyTo({ ...this.initialView, duration })
    }

    /** Fly to a global view above longitude 0, latitude 0. */
    globalView(duration = 2): Promise<boolean> {
        // Use a stable geographic global view independent of Cesium's mutable home rectangle.
        return this.flyTo({ longitude: 0, latitude: 0, height: 23000000, heading: 0, pitch: -90, roll: 0, duration })
    }

    destroy(): void {
        if (this.destroyed) return
        ++this.operationId
        this.destroyed = true
        const settle = this.settleFlight
        if (!this.viewer.isDestroyed()) {
            this.beforeControl?.()
            this.cancelPendingTarget()
            this.viewer.camera.cancelFlight()
            if (this.previousEnableTilt !== undefined) {
                this.viewer.scene.screenSpaceCameraController.enableTilt = this.previousEnableTilt
            }
        }
        settle?.(false)
        this.previousEnableTilt = undefined
    }

    private prepareControl(): number {
        const operation = this.operationId + 1
        this.cancelFlight()
        return operation
    }

    private cancelPendingTarget(): void {
        if (!this.targetPending) return
        this.targetPending = false
        // camera.cancelFlight alone cannot cancel Viewer.flyTo waiting for data.
        // A public flyTo with an empty entity list supersedes that queued request
        // and ends without moving the camera. Avoid Cesium private zoom fields.
        void this.viewer.flyTo([], { duration: 0 }).catch(() => {})
        this.viewer.scene.requestRender()
    }

    private validateDuration(duration: number): void {
        if (!Number.isFinite(duration) || duration < 0) throw new RangeError('duration must be a non-negative number')
    }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('CameraManager has been destroyed')
    }

    private validate(view: CameraView): void {
        this.assertAlive()
        for (const key of ['longitude', 'latitude', 'height'] as const) {
            if (!Number.isFinite(view[key])) throw new RangeError(`${key} must be finite`)
        }
        if (view.latitude < -90 || view.latitude > 90) throw new RangeError('latitude must be between -90 and 90')
        for (const key of ['heading', 'pitch', 'roll'] as const) {
            if (view[key] !== undefined && !Number.isFinite(view[key])) throw new RangeError(`${key} must be finite`)
        }
    }

    private toCesiumView(view: CameraView) {
        return {
            destination: Cartesian3.fromDegrees(view.longitude, view.latitude, view.height, this.viewer.scene.globe?.ellipsoid),
            orientation: {
                heading: CesiumMath.toRadians(view.heading ?? 0),
                pitch: CesiumMath.toRadians(view.pitch ?? -90),
                roll: CesiumMath.toRadians(view.roll ?? 0)
            }
        }
    }
}
