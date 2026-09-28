import * as Cesium from 'cesium'

export interface FlyToOptions {
    viewer: Cesium.Viewer
    longitude: number
    latitude: number
    height?: number
    duration?: number
}

export function flyTo(options: FlyToOptions) {
    const {
        viewer,
        longitude,
        latitude,
        height = 3000,
        duration = 2
    } = options

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
            longitude,
            latitude,
            height
        ),
        duration
    })
}