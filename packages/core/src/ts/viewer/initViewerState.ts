import { Camera, Cartesian3, Color, Math as CesiumMath, Rectangle, type Viewer } from 'cesium'
import type { Config } from '../config/types'

function toRadians(value = 0, unit: 'degree' | 'radian' = 'degree') {
    return unit === 'radian' ? value : CesiumMath.toRadians(value)
}

export function initViewerState(viewer: Viewer, config: Config) {
    const { homeView, startup } = config 
    viewer.scene.globe.baseColor = Color.fromCssColorString(startup.globeBaseColor)
    viewer.scene.backgroundColor = Color.fromCssColorString(startup.backgroundColor)
    viewer.scene.postProcessStages.fxaa.enabled = startup.fxaa
    viewer.scene.debugShowFramesPerSecond = startup.showFps
    viewer.resolutionScale = startup.resolutionScale


    Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
        homeView.longitude - 0.5,
        homeView.latitude - 0.5,
        homeView.longitude + 0.5,
        homeView.latitude + 0.5
    )
    viewer.camera.setView({
        destination: Cartesian3.fromDegrees(
            homeView.longitude,
            homeView.latitude,
            homeView.height
        ),
        orientation: {
            heading: toRadians(homeView.heading, homeView.unit),
            pitch: toRadians(homeView.pitch, homeView.unit),
            roll: toRadians(homeView.roll, homeView.unit)
        }
    })

    viewer.scene.screenSpaceCameraController.zoomFactor = startup.zoomFactor
}
