import { BoundingSphere, Cartesian3, ClippingPlane, Matrix4, Plane, Transforms } from 'cesium'
import { circle } from '@turf/turf'
import type { WorldDegree } from '../../viewer/types'

/** 点到三维线段的最近位置；零长度线段退化为起点。 */
export function projectPointToSegment(point: Cartesian3, start: Cartesian3, end: Cartesian3) {
    const direction = Cartesian3.subtract(end, start, new Cartesian3())
    const lengthSquared = Cartesian3.magnitudeSquared(direction)
    const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
        Cartesian3.dot(Cartesian3.subtract(point, start, new Cartesian3()), direction) / lengthSquared))
    const position = Cartesian3.lerp(start, end, fraction, new Cartesian3())
    return { position, fraction, distance: Cartesian3.distance(point, position) }
}

/** 按不大于 spacing 的间距插入三维点，包含首尾且不修改输入。 */
export function interpolateSegment(start: Cartesian3, end: Cartesian3, spacing = 1): Cartesian3[] {
    if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError('插值间距必须为正数。')
    const count = Math.ceil(Cartesian3.distance(start, end) / spacing)
    if (!count) return [Cartesian3.clone(start)]
    return Array.from({ length: count + 1 }, (_, index) => Cartesian3.lerp(start, end, index / count, new Cartesian3()))
}

/** 地理圆半径以米计，返回闭合的经纬度环；沿用 Turf 的球面算法。 */
export function getCirclePositions(center: WorldDegree, radius: number, steps = 64): Cartesian3[] {
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isInteger(steps) || steps < 3) throw new RangeError('圆半径必须为正数，分段数至少为 3。')
    const ring = circle([center.longitude, center.latitude], radius / 1000, { steps }).geometry.coordinates[0]
    return ring.map(([longitude, latitude]) => Cartesian3.fromDegrees(longitude, latitude, center.height))
}

/** 为局部凸多边形生成向内法线的裁剪平面，同时返回其 ENU 参考矩阵。 */
export function getPolygonClippingPlanes(positions: readonly Cartesian3[]) {
    const points = [...positions]
    if (points.length > 1 && Cartesian3.equals(points[0], points[points.length - 1])) points.pop()
    if (points.length < 3) throw new RangeError('裁剪边界至少需要三个点。')
    const modelMatrix = Transforms.eastNorthUpToFixedFrame(BoundingSphere.fromPoints(points).center)
    const inverse = Matrix4.inverseTransformation(modelMatrix, new Matrix4())
    const local = points.map(point => Matrix4.multiplyByPoint(inverse, point, new Cartesian3()))
    let signedArea = 0
    for (let i = 0; i < local.length; i++) {
        const a = local[i], b = local[(i + 1) % local.length]
        signedArea += a.x * b.y - b.x * a.y
    }
    if (Math.abs(signedArea) < 1e-8) throw new RangeError('裁剪边界不能退化为一条直线。')
    const orientation = Math.sign(signedArea)
    const planes = local.map((point, index) => {
        const next = local[(index + 1) % local.length]
        const normal = new Cartesian3(-(next.y - point.y) * orientation, (next.x - point.x) * orientation, 0)
        if (Cartesian3.magnitudeSquared(normal) === 0) throw new RangeError('裁剪边界的相邻点不能重合。')
        Cartesian3.normalize(normal, normal)
        return ClippingPlane.fromPlane(Plane.fromPointNormal(point, normal))
    })
    return { planes, modelMatrix }
}
