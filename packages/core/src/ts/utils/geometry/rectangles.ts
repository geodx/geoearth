import { Cartesian3, Ellipsoid, Rectangle } from 'cesium'

export type RectanglePoints = [Cartesian3, Cartesian3, Cartesian3, Cartesian3]

function validatePoints(...points: Cartesian3[]): void {
    if (!points.every(point => [point.x, point.y, point.z].every(Number.isFinite))) {
        throw new RangeError('Rectangle coordinates must be finite.')
    }
}

/** 经纬线对齐的矩形：西北、东北、东南、西南。不重复首点，统一采用 start 的椭球高。
 * 经度采用跨日期变更线时的短区间，不把 179°/-179° 误算成 358°。
 */
export function getRectanglePoints(start: Cartesian3, end: Cartesian3, ellipsoid = Ellipsoid.WGS84): RectanglePoints {
    validatePoints(start, end)
    const a = ellipsoid.cartesianToCartographic(start)
    const b = ellipsoid.cartesianToCartographic(end)
    if (!a || !b) throw new RangeError('Rectangle points must be valid ellipsoid positions.')
    const bounds = Rectangle.fromCartographicArray([a, b])
    if (bounds.width < 1e-12 || bounds.height < 1e-12) throw new RangeError('Rectangle must have non-zero width and height.')
    return [
        Cartesian3.fromRadians(bounds.west, bounds.north, a.height, ellipsoid),
        Cartesian3.fromRadians(bounds.east, bounds.north, a.height, ellipsoid),
        Cartesian3.fromRadians(bounds.east, bounds.south, a.height, ellipsoid),
        Cartesian3.fromRadians(bounds.west, bounds.south, a.height, ellipsoid),
    ]
}

/** 局部三维斜矩形：start/end 为底边，offset 指定垂直于底边的宽度与方向。
 * 返回 A、B、C、D 四角；不修改输入。适用于局部场景，不是全球测地矩形。
 */
export function getInclinedRectangle(start: Cartesian3, end: Cartesian3, offset: Cartesian3, ellipsoid = Ellipsoid.WGS84): RectanglePoints {
    validatePoints(start, end, offset)
    const base = Cartesian3.subtract(end, start, new Cartesian3())
    if (Cartesian3.magnitude(base) < 1e-6) throw new RangeError('Rectangle base points must be distinct.')
    const midpoint = Cartesian3.midpoint(start, end, new Cartesian3())
    const up = ellipsoid.geodeticSurfaceNormal(midpoint, new Cartesian3())
    if (!up) throw new RangeError('Rectangle base must be near the ellipsoid surface.')
    const side = Cartesian3.cross(up, base, new Cartesian3())
    if (Cartesian3.magnitude(side) < 1e-6) throw new RangeError('Rectangle base must not be vertical.')
    Cartesian3.normalize(side, side)
    const width = Cartesian3.dot(Cartesian3.subtract(offset, start, new Cartesian3()), side)
    if (Math.abs(width) < 1e-6) throw new RangeError('Rectangle width must be non-zero.')
    Cartesian3.multiplyByScalar(side, width, side)
    return [Cartesian3.clone(start), Cartesian3.clone(end),
    Cartesian3.add(end, side, new Cartesian3()), Cartesian3.add(start, side, new Cartesian3())]
}
