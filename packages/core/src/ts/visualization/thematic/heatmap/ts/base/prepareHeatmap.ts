import type { WorldRectangle } from '../../../../../viewer/types'
import type { HeatmapPoint } from '../types'

export const wrapLongitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180

export function prepareHeatmap(points: readonly HeatmapPoint[], explicit?: WorldRectangle) {
    for (const point of points) {
        if (![point.longitude, point.latitude, point.value].every(Number.isFinite) || Math.abs(point.latitude) > 90 || point.value < 0 || (point.radius !== undefined && (!Number.isFinite(point.radius) || point.radius <= 0))) throw new RangeError('Heatmap requires finite coordinates, non-negative values and positive radii.')
    }
    let bounds: WorldRectangle
    if (explicit) bounds = { ...explicit }
    else {
        if (!points.length) throw new RangeError('Empty heatmap data requires explicit bounds.')
        // 在经度环上排除最大的空白区，得到包含数据的最小范围，兼容跨日期变更线。
        const longitudes = points.map(point => wrapLongitude(point.longitude)).sort((a, b) => a - b)
        let gap = -1, start = 0
        for (let i = 0; i < longitudes.length; i++) {
            const next = longitudes[(i + 1) % longitudes.length] + (i === longitudes.length - 1 ? 360 : 0)
            if (next - longitudes[i] > gap) {
                gap = next - longitudes[i]
                start = (i + 1) % longitudes.length
            }
        }
        const west = longitudes[start], east = longitudes[(start + longitudes.length - 1) % longitudes.length]
        let south = 90, north = -90
        for (const point of points) {
            south = Math.min(south, point.latitude)
            north = Math.max(north, point.latitude)
        }
        bounds = { west, east, south, north }
        if (west === east) {
            bounds.west = wrapLongitude(west - .01)
            bounds.east = wrapLongitude(east + .01)
        }
        if (south === north) {
            bounds.south = Math.max(-90, south - .01)
            bounds.north = Math.min(90, north + .01)
        }
    }
    if (![bounds.west, bounds.east, bounds.south, bounds.north].every(Number.isFinite) || bounds.west < -180 || bounds.west > 180 || bounds.east < -180 || bounds.east > 180 || bounds.south < -90 || bounds.north > 90 || bounds.north <= bounds.south || bounds.west === bounds.east) throw new RangeError('Invalid heatmap bounds.')
    const span = bounds.east > bounds.west ? bounds.east - bounds.west : bounds.east + 360 - bounds.west
    const data = points.map(point => {
        const longitude = wrapLongitude(point.longitude)
        let offset = longitude - bounds.west
        if (offset < 0) offset += 360
        return { ...point, x: offset / span, y: (bounds.north - point.latitude) / (bounds.north - bounds.south) }
    }).filter(point => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)
    return { bounds, span, data }
}
