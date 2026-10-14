import { Camera, Cartesian3, Math as CesiumMath, Color, Rectangle, type Viewer } from 'cesium'
import type { Config } from '../config/types'

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
            heading: CesiumMath.toRadians(homeView.heading),
            pitch: CesiumMath.toRadians(homeView.pitch),
            roll: CesiumMath.toRadians(homeView.roll)
        }
    })

    viewer.scene.screenSpaceCameraController.zoomFactor = startup.zoomFactor
    viewer.camera.percentageChanged = 0.01
}
