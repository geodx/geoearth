import { Cartesian2, Cartesian3, defined, type EntityCollection, type Viewer } from 'cesium'

/**
 * 从屏幕坐标拾取场景坐标。
 *
 * 优先拾取模型、3D Tiles 和地形深度；
 * 失败后依次回退到 Globe 和椭球表面。
 */
export function pickPosition(viewer: Viewer, windowPosition: Cartesian2, exclude?: EntityCollection): Cartesian3 | undefined {
    const scene = viewer.scene
    const { clientWidth, clientHeight } = scene.canvas
    if (!Number.isFinite(windowPosition.x) || !Number.isFinite(windowPosition.y) ||
        windowPosition.x < 0 || windowPosition.y < 0 ||
        windowPosition.x >= clientWidth || windowPosition.y >= clientHeight) return undefined

    // 深度拾取不能直接排除实体；命中自己的临时预览时，回退到 Globe/椭球。
    const picked = exclude ? scene.pick(windowPosition) : undefined
    const isPreview = picked?.id && exclude?.contains(picked.id)
    if (scene.pickPositionSupported && !isPreview) {
        const position = scene.pickPosition(windowPosition)

        if (defined(position)) {
            return Cartesian3.clone(position)
        }
    }

    const ray = viewer.camera.getPickRay(windowPosition)

    if (defined(ray)) {
        const globePosition = scene.globe?.pick(ray, scene)

        if (defined(globePosition)) {
            return Cartesian3.clone(globePosition)
        }
    }

    const ellipsoidPosition = viewer.camera.pickEllipsoid(windowPosition, scene.globe?.ellipsoid ?? scene.ellipsoid)

    return defined(ellipsoidPosition) ? Cartesian3.clone(ellipsoidPosition) : undefined
}
