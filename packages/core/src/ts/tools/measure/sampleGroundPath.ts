import { Cartesian3, Cartographic, EllipsoidGeodesic, EllipsoidTerrainProvider, sampleTerrainMostDetailed, type Viewer } from 'cesium'
import { ElevationSource, type GroundDistanceOptions } from './types'

/** 沿控制点间的测地线加密，再采样地形；无地形数据时明确返回椭球来源。 */
export async function sampleGroundPath(viewer: Viewer, positions: Cartesian3[], options: GroundDistanceOptions) {
    const ellipsoid = viewer.scene.globe.ellipsoid
    const points = positions.map(position => ellipsoid.cartesianToCartographic(position))
    const segments = points.slice(1).map((end, i) => {
        const start = points[i]
        const same = Math.abs(start.longitude - end.longitude) < 1e-14 && Math.abs(start.latitude - end.latitude) < 1e-14
        return same ? undefined : new EllipsoidGeodesic(start, end, ellipsoid)
    })
    const length = segments.reduce((sum, segment) => sum + (segment?.surfaceDistance ?? 0), 0)
    const maxSamples = Math.max(options.maxSamples ?? 4096, points.length)
    const spacing = Math.max(options.sampleSpacing ?? 30, length / Math.max(1, maxSamples - points.length))
    const samples: Cartographic[] = [Cartographic.clone(points[0])]
    segments.forEach((segment, i) => {
        const count = Math.max(1, Math.ceil((segment?.surfaceDistance ?? 0) / spacing))
        for (let step = 1; step <= count; step++) {
            const point = segment ? segment.interpolateUsingFraction(step / count) : Cartographic.clone(points[i + 1])
            point.height = 0
            samples.push(point)
        }
    })
    samples[0].height = 0

    const sources = new Set<ElevationSource>()
    const provider = viewer.terrainProvider
    if (!(provider instanceof EllipsoidTerrainProvider) && provider.availability) {
        try {
            await sampleTerrainMostDetailed(provider, samples)
            for (const sample of samples) {
                if (Number.isFinite(sample.height)) sources.add(ElevationSource.TERRAIN)
                else sample.height = fallbackHeight(sample)
            }
        } catch {
            for (const sample of samples) sample.height = fallbackHeight(sample)
        }
    } else {
        for (const sample of samples) sample.height = fallbackHeight(sample)
    }
    return {
        sampledPositions: samples.map(point => ellipsoid.cartographicToCartesian(point)),
        sources: [...sources],
    }

    function fallbackHeight(point: Cartographic): number {
        if (provider instanceof EllipsoidTerrainProvider) {
            sources.add(ElevationSource.ELLIPSOID)
            return 0
        }
        const height = viewer.scene.globe.getHeight(point)
        if (Number.isFinite(height)) {
            sources.add(ElevationSource.TERRAIN)
            return height!
        }
        sources.add(ElevationSource.ELLIPSOID)
        return 0
    }
}
