import type { Viewer } from 'cesium'
import { BaseEvent } from '../base/BaseEvent'
import { CameraEventType, type CameraEventPayload } from '../types'

/**
 * 统一管理 Cesium 相机事件。
 */
export class CameraEvent extends BaseEvent<CameraEventType, CameraEventPayload> {
    private readonly viewer: Viewer

    private removeChangedListener?: () => void
    private removeMoveStartListener?: () => void
    private removeMoveEndListener?: () => void

    /**
     * 限制 CHANGE 事件触发频率，避免相机移动时业务回调过于频繁。
     */
    private readonly changeInterval = 80
    private lastChangeTime = 0

    constructor(viewer: Viewer) {
        super()

        this.viewer = viewer
        this.bindCesiumEvents()
    }

    private bindCesiumEvents(): void {
        const camera = this.viewer.camera

        this.removeChangedListener =
            camera.changed.addEventListener(() => {
                const now = performance.now()

                if (now - this.lastChangeTime < this.changeInterval) {
                    return
                }

                this.lastChangeTime = now

                this.raiseEvent(CameraEventType.CHANGE, {
                    type: CameraEventType.CHANGE,
                    camera
                })
            })

        this.removeMoveStartListener =
            camera.moveStart.addEventListener(() => {
                this.raiseEvent(CameraEventType.MOVE_START, {
                    type: CameraEventType.MOVE_START,
                    camera
                })
            })

        this.removeMoveEndListener =
            camera.moveEnd.addEventListener(() => {
                this.raiseEvent(CameraEventType.MOVE_END, {
                    type: CameraEventType.MOVE_END,
                    camera
                })
            })
    }

    /**
     * flyTo 开始前由 GeoEarth 相机模块调用。
     *
     * Cesium 没有独立的 flyStart 事件，所以由封装层主动触发。
     */
    raiseFlyStart(): void {
        this.raiseEvent(CameraEventType.FLY_START, {
            type: CameraEventType.FLY_START,
            camera: this.viewer.camera
        })
    }

    /**
     * flyTo 完成后由 GeoEarth 相机模块调用。
     */
    raiseFlyEnd(): void {
        this.raiseEvent(CameraEventType.FLY_END, {
            type: CameraEventType.FLY_END,
            camera: this.viewer.camera
        })
    }

    destroy(): void {
        // Cesium addEventListener 返回的函数用于移除对应监听。
        this.removeChangedListener?.()
        this.removeMoveStartListener?.()
        this.removeMoveEndListener?.()

        this.removeChangedListener = undefined
        this.removeMoveStartListener = undefined
        this.removeMoveEndListener = undefined

        this.removeAllEventListeners()
    }
}