import { Cartesian2, Cartesian3, defined, type Viewer } from 'cesium'

/**
 * 从屏幕坐标拾取场景坐标。
 *
 * 优先拾取模型、3D Tiles 和地形深度；
 * 失败后依次回退到 Globe 和椭球表面。
 */
export function pickPosition(viewer: Viewer, windowPosition: Cartesian2): Cartesian3 | undefined {
    const scene = viewer.scene

    if (scene.pickPositionSupported) {
        const position = scene.pickPosition(windowPosition)

        if (defined(position)) {
            return Cartesian3.clone(position)
        }
    }

    const ray = viewer.camera.getPickRay(windowPosition)

    if (defined(ray)) {
        const globePosition = scene.globe.pick(ray, scene)

        if (defined(globePosition)) {
            return Cartesian3.clone(globePosition)
        }
    }

    const ellipsoidPosition = viewer.camera.pickEllipsoid(windowPosition, scene.globe.ellipsoid)

    return defined(ellipsoidPosition) ? Cartesian3.clone(ellipsoidPosition) : undefined
}