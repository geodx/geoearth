import { Cartesian3, HeadingPitchRange, Rectangle, Math as CesiumMath, type Viewer } from 'cesium'
import { getCameraExtent, getScreenCenterPoint } from '../utils/camera/queries'
import type { CameraEvent } from '../events/modules/CameraEvent'
import type { WorldDegree, WorldRectangle } from '../viewer/types'
import type { CameraView, CameraFlyToOptions } from './types'
import { BookmarkManager } from './bookmark/BookmarkManager'
import { PathRoaming } from './roaming/PathRoaming'

/** 绑定单个 Viewer；公开角度使用度，距离使用米。 */
export class CameraManager {
    readonly bookmarks: BookmarkManager
    private roamingInstance?: PathRoaming

    get roaming(): PathRoaming {
        this.assertAlive()
        return this.roamingInstance ??= new PathRoaming(this.viewer, {}, () => this.cancelFlight())
    }
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
        this.bookmarks = new BookmarkManager(viewer, this)
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

    /** 相机椭球高度，单位：米。 */
    getHeight(): number {
        return this.getView().height
    }

    /** 屏幕中心射线与地球的交点，包含已加载的地形。 */
    getCenter(): WorldDegree | undefined {
        this.assertAlive()
        return getScreenCenterPoint(this.viewer)
    }

    /** 角度制视野包围盒；west > east 表示跨日期变更线。 */
    getExtent(): WorldRectangle | undefined {
        this.assertAlive()
        return getCameraExtent(this.viewer)
    }

    setView(view: CameraView): void {
        this.validate(view)
        const operation = this.prepareControl()
        if (operation !== this.operationId || this.destroyed) return
        this.viewer.camera.setView(this.toCesiumView(view))
        this.viewer.scene.requestRender()
    }

    /** 飞行完成返回 true；被中断或取消时返回 false。 */
    flyTo(options: CameraFlyToOptions): Promise<boolean> {
        this.validate(options)
        const duration = options.duration ?? 2
        if (!Number.isFinite(duration) || duration < 0) throw new RangeError('duration must be a non-negative number')
        return this.runFlight((complete, cancel) => {
            this.viewer.camera.flyTo({ ...this.toCesiumView(options), duration, complete, cancel })
        })
    }

    /** 定位到地理矩形；边界以度计，支持跨日期变更线。 */
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

    /** 定位到 Cesium 实体、数据源、影像层或瓦片集。 */
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
        this.roamingInstance?.pause()
        ++this.operationId
        const settle = this.settleFlight
        this.beforeControl?.()
        this.cancelPendingTarget()
        this.viewer.camera.cancelFlight()
        settle?.(false)
    }

    /** 恢复朝北方向，保留相机位置、俯仰角和翻滚角。 */
    resetNorth(): void {
        this.setView({ ...this.getView(), heading: 0 })
    }

    /** 俯视当前地球中心点；视线未落在地球上时返回 false。 */
    setTopView(): boolean {
        const center = this.getCenter()
        if (!center) return false
        const view = this.getView()
        this.setView({ ...center, height: Math.max(view.height, center.height + 1), heading: view.heading, pitch: -90, roll: 0 })
        return true
    }

    /** 显式设置视角锁定；解锁时恢复此前的倾斜控制设置。 */
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

    /** 恢复管理器创建时记录的视角。 */
    reset(duration = 2): Promise<boolean> {
        return this.flyTo({ ...this.initialView, duration })
    }

    /** 飞到经纬度均为零的全球视角。 */
    globalView(duration = 2): Promise<boolean> {
        // 使用固定地理视角，避免依赖 Cesium 可变的默认视野。
        return this.flyTo({ longitude: 0, latitude: 0, height: 23000000, heading: 0, pitch: -90, roll: 0, duration })
    }

    destroy(): void {
        if (this.destroyed) return
        ++this.operationId
        this.destroyed = true
        this.bookmarks.destroy()
        this.roamingInstance?.destroy()
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
        // camera.cancelFlight 无法取消 Viewer.flyTo 等待数据的任务。
        // 通过公开 flyTo 传空实体列表，替代尚在队列中的定位请求，
        // 使其结束并保持当前位置，无需访问 Cesium 私有缩放字段。
        void this.viewer.flyTo([], { duration: 0 }).catch(() => { })
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
