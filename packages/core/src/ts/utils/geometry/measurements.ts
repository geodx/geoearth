import { Cartesian3, Cartographic, Ellipsoid, EllipsoidGeodesic, Math as CesiumMath } from 'cesium'
import { area, polygon } from '@turf/turf'

/** 三维直线段长度之和，单位米。 */
export function getSpaceDistance(positions: readonly Cartesian3[]): number {
    let distance = 0
    for (let i = 1; i < positions.length; i++) distance += Cartesian3.distance(positions[i - 1], positions[i])
    return distance
}

/** 忽略高度的椭球测地线长度，单位米。 */
export function getSurfaceDistance(positions: readonly Cartesian3[], ellipsoid = Ellipsoid.WGS84): number {
    let distance = 0
    for (let i = 1; i < positions.length; i++) {
        const start = ellipsoid.cartesianToCartographic(positions[i - 1])
        const end = ellipsoid.cartesianToCartographic(positions[i])
        if (Cartographic.equalsEpsilon(new Cartographic(start.longitude, start.latitude), new Cartographic(end.longitude, end.latitude), 1e-14)) continue
        distance += new EllipsoidGeodesic(start, end, ellipsoid).surfaceDistance
    }
    return distance
}

/** Turf 球面面积，单位平方米；忽略高度，输入为简单多边形外环。 */
export function getSurfaceArea(positions: readonly Cartesian3[], ellipsoid = Ellipsoid.WGS84): number {
    if (positions.length < 3) return 0
    let previousLongitude = ellipsoid.cartesianToCartographic(positions[0]).longitude
    const ring = positions.map(position => {
        const point = ellipsoid.cartesianToCartographic(position)
        // 展开经度，避免跨日期变更线的小多边形被当作环绕全球。
        const longitude = previousLongitude + CesiumMath.negativePiToPi(point.longitude - previousLongitude)
        previousLongitude = longitude
        return [CesiumMath.toDegrees(longitude), CesiumMath.toDegrees(point.latitude)]
    })
    ring.push([...ring[0]])
    return area(polygon([ring]))
}

/** 以中间点为顶点的三维夹角，单位度。 */
export function getSpaceAngle(positions: readonly [Cartesian3, Cartesian3, Cartesian3]): number {
    const first = Cartesian3.subtract(positions[0], positions[1], new Cartesian3())
    const second = Cartesian3.subtract(positions[2], positions[1], new Cartesian3())
    if (Cartesian3.magnitudeSquared(first) === 0 || Cartesian3.magnitudeSquared(second) === 0) {
        throw new Error('角度测量的两条边不能为零长度。')
    }
    return CesiumMath.toDegrees(Cartesian3.angleBetween(first, second))
}
