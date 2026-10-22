/** 角度归一化到 [0, 2π)，包含负角度。 */
export const normalizeAngle = (radians: number): number => (radians % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)

/** 从起点到终点的平面方向角，逆时针为正；重合点没有确定方向。 */
export function directionAngle(x1: number, y1: number, x2: number, y2: number): number {
    return x1 === x2 && y1 === y2 ? NaN : normalizeAngle(Math.atan2(y2 - y1, x2 - x1))
}

export function triangleArea(a: number, b: number, c: number): number {
    if (![a, b, c].every(Number.isFinite) || Math.min(a, b, c) < 0) throw new RangeError('边长必须为非负有限数值。')
    if (a + b <= c || a + c <= b || b + c <= a) return 0
    const half = (a + b + c) / 2
    return Math.sqrt(half * (half - a) * (half - b) * (half - c))
}
