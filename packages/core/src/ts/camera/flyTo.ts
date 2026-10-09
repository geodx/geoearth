import * as Cesium from 'cesium'
import type { CameraEvent } from '../events/modules/CameraEvent'

export interface FlyToOptions {
    viewer: Cesium.Viewer
    /** 传入同一个 GeoEarth 实例的 earth.event.camera。 */
    cameraEvent: CameraEvent
    longitude: number
    latitude: number
    height?: number
    duration?: number
}

export function flyTo(options: FlyToOptions): void {
    const {
        viewer,
        cameraEvent,
        longitude,
        latitude,
        height = 3000,
        duration = 2
    } = options

    const destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, height)

    cameraEvent.raiseFlyStart()

    viewer.camera.flyTo({
        destination,
        duration,
        // 仅正常完成时通知；取消飞行不会触发 flyEnd。
        complete: () => cameraEvent.raiseFlyEnd()
    })
}
