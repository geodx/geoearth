import { Cartesian3, EllipsoidalOccluder, SceneMode, SceneTransforms, type Viewer } from 'cesium'

/** 返回 CSS 像素坐标；只判断椭球背面遮挡，不判断地形或建筑遮挡。 */
export function projectPosition(viewer: Viewer, position: Cartesian3) {
    const scene = viewer.scene
    if (scene.mode === SceneMode.SCENE3D && !new EllipsoidalOccluder(scene.globe.ellipsoid, scene.camera.positionWC).isPointVisible(position)) return undefined
    return SceneTransforms.worldToWindowCoordinates(scene, position)
}
