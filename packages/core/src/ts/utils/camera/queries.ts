import { Cartesian2, Math as CesiumMath, type Viewer } from 'cesium'
import type { WorldDegree, WorldRectangle } from '../../viewer/types'
import { pickPosition } from '../picking/pickPosition'
import { polygon, multiPolygon } from '@turf/turf'

/** 使用 CSS 像素获取视口中心，允许中心落在地形、模型或椭球上。 */
export function getScreenCenterPoint(viewer: Viewer, options: { surface?: boolean } = {}): WorldDegree | undefined {
    const screen = new Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2)
    const ray = viewer.camera.getPickRay(screen)
    const point = options.surface ? pickPosition(viewer, screen) : ray && viewer.scene.globe.pick(ray, viewer.scene)
    if (!point) return undefined
    const location = viewer.scene.globe.ellipsoid.cartesianToCartographic(point)
    return { longitude: CesiumMath.toDegrees(location.longitude), latitude: CesiumMath.toDegrees(location.latitude), height: location.height }
}

/** 返回角度制视野包围盒；视野没有覆盖地球时返回 undefined。 */
export function getCameraExtent(viewer: Viewer): WorldRectangle | undefined {
    const rectangle = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
    if (!rectangle) return undefined
    return { west: CesiumMath.toDegrees(rectangle.west), south: CesiumMath.toDegrees(rectangle.south), east: CesiumMath.toDegrees(rectangle.east), north: CesiumMath.toDegrees(rectangle.north) }
}

/** 视野包围盒的 GeoJSON；跨日期变更线时拆为两个面，避免横跨整个地球。 */
export function getCameraExtentGeoJson(viewer: Viewer) {
    const extent = getCameraExtent(viewer)
    if (!extent) return undefined
    const ring = (west: number, east: number) => [[west, extent.south], [east, extent.south], [east, extent.north], [west, extent.north], [west, extent.south]]
    return extent.west <= extent.east
        ? polygon([ring(extent.west, extent.east)])
        : multiPolygon([[ring(extent.west, 180)], [ring(-180, extent.east)]])
}
