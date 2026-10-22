import { Cartographic, EllipsoidGeodesic, Math as CesiumMath, type Viewer } from 'cesium'
import { sampleHeights } from '../../utils/scene/heights'
import type { WorldDegree } from '../../viewer/types'
import type { PrepareRoamingPathOptions } from './types'

export function validatePath(path: readonly WorldDegree[]): WorldDegree[] {
    if (!Array.isArray(path) || path.length < 2) throw new RangeError('A roaming path needs at least two points')
    return path.map(point => {
        if (!point || ![point.longitude, point.latitude, point.height].every(Number.isFinite) || Math.abs(point.latitude) > 90) {
            throw new RangeError('Path positions must have finite longitude, latitude and height')
        }
        return { longitude: point.longitude, latitude: point.latitude, height: point.height }
    })
}

/** 逐点采样高度；模型表面缺失时按原索引回退到地形高度。 */
export async function preparePath(viewer: Viewer, path: readonly WorldDegree[], options: PrepareRoamingPathOptions, exclude: object[] = []): Promise<WorldDegree[]> {
    const points = validatePath(path)
    const mode = options.heightMode ?? 'surface'
    if (!['absolute', 'terrain', 'surface'].includes(mode)) throw new RangeError('Invalid heightMode')
    const offset = options.heightOffset ?? 0
    const spacing = options.sampleSpacing ?? 30
    const maxSamples = options.maxSamples ?? 4096
    if (!Number.isFinite(offset) || !Number.isFinite(spacing) || spacing <= 0 || !Number.isInteger(maxSamples) || maxSamples < points.length) throw new RangeError('Invalid path sampling options')
    if (mode === 'absolute') return points.map(point => ({ ...point, height: point.height + offset }))
    const ellipsoid = viewer.scene.globe.ellipsoid
    const input = points.map(point => Cartographic.fromDegrees(point.longitude, point.latitude, point.height))
    const segments = input.slice(1).map((end, index) => {
        const start = input[index]
        return Math.abs(start.longitude - end.longitude) + Math.abs(start.latitude - end.latitude) < 1e-12
            ? undefined : new EllipsoidGeodesic(start, end, ellipsoid)
    })
    const length = segments.reduce((sum, segment) => sum + (segment?.surfaceDistance ?? 0), 0)
    const effectiveSpacing = Math.max(spacing, length / Math.max(1, maxSamples - points.length))
    const samples = [Cartographic.clone(input[0])]
    segments.forEach((segment, index) => {
        const count = Math.max(1, Math.ceil((segment?.surfaceDistance ?? 0) / effectiveSpacing))
        for (let i = 1; i <= count; i++) {
            const point = segment ? segment.interpolateUsingFraction(i / count) : Cartographic.clone(input[index + 1])
            point.height = input[index].height + (input[index + 1].height - input[index].height) * i / count
            samples.push(point)
        }
    })
    const degrees = samples.map(point => ({ longitude: CesiumMath.toDegrees(point.longitude), latitude: CesiumMath.toDegrees(point.latitude), height: point.height }))
    const heights = await sampleHeights(viewer, degrees, { mode, exclude })
    return degrees.map((point, index) => ({ ...point, height: heights[index] + offset }))
}
