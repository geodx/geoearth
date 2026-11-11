import { Cartographic, EllipsoidGeodesic, EllipsoidTerrainProvider, Math as CesiumMath } from 'cesium'
import { toCartesian, type WorldPosition } from '../../utils/coordinate/positions'
import { sampleHeights } from '../../utils/scene/heights'
import { runSceneTask } from '../../utils/scene/runSceneTask'
import type { SceneHost } from '../../utils/scene/types'
import type { ProfileOptions, ProfileResult, ProfileSample } from './types'

/** 沿多段椭球测地线计算剖面；高度为绝对椭球高，所有距离均以米计。 */
export async function computeProfile(host: SceneHost, path: readonly WorldPosition[], options: ProfileOptions = {}): Promise<ProfileResult> {
    const viewer = 'viewer' in host ? host.viewer : host
    if (viewer.isDestroyed()) throw new Error('Viewer has been destroyed.')
    options.signal?.throwIfAborted()
    const spacing = options.sampleSpacing ?? 30
    const maxSamples = options.maxSamples ?? 4096
    const source = options.source ?? 'terrain'
    if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError('剖面采样间距必须为正数。')
    if (!Number.isSafeInteger(maxSamples) || maxSamples < 2) throw new RangeError('剖面采样上限必须为至少 2 的整数。')
    if (source !== 'terrain' && source !== 'surface') throw new RangeError('剖面高度来源必须为 terrain 或 surface。')
    if (path.length < 2) throw new RangeError('剖面路径至少需要两个不同位置。')

    const ellipsoid = viewer.scene.globe.ellipsoid
    const controls: Cartographic[] = []
    for (const position of path) {
        const point = ellipsoid.cartesianToCartographic(toCartesian(position, ellipsoid))
        if (!point) throw new RangeError('剖面控制点必须能转换为地理坐标。')
        const previous = controls[controls.length - 1]
        if (previous && Math.abs(CesiumMath.negativePiToPi(point.longitude - previous.longitude)) < 1e-14
            && Math.abs(point.latitude - previous.latitude) < 1e-14) continue
        controls.push(point)
    }
    if (controls.length < 2) throw new RangeError('剖面路径至少需要两个不同位置。')
    if (controls.length > maxSamples) throw new RangeError('剖面采样上限不能少于路径控制点数量。')
    const segments = controls.slice(1).map((end, index) => new EllipsoidGeodesic(controls[index], end, ellipsoid))
    const totalDistance = segments.reduce((sum, segment) => sum + segment.surfaceDistance, 0)
    if (!Number.isFinite(totalDistance) || totalDistance <= 0) throw new RangeError('剖面路径必须具有有效的水平长度。')
    const budget = maxSamples - controls.length
    const effectiveSpacing = Math.max(spacing, budget > 0 ? totalDistance / budget : Infinity)
    const samples: ProfileSample[] = []
    let distance = 0
    const append = (point: Cartographic, along: number) => samples.push({
        longitude: CesiumMath.toDegrees(point.longitude),
        latitude: CesiumMath.toDegrees(point.latitude),
        height: 0,
        distance: along,
    })
    append(controls[0], 0)
    segments.forEach((segment, index) => {
        const count = Math.max(1, Math.ceil(segment.surfaceDistance / effectiveSpacing))
        for (let step = 1; step <= count; step++) {
            const fraction = step / count
            const point = step === count ? controls[index + 1] : segment.interpolateUsingFraction(fraction)
            append(point, distance + segment.surfaceDistance * fraction)
        }
        distance += segment.surfaceDistance
    })

    options.signal?.throwIfAborted()
    const provider = viewer.terrainProvider
    return runSceneTask(host, options.signal, async (viewer, signal) => {
        const heights = await sampleHeights(viewer, samples, {
            mode: source, terrainLevel: options.terrainLevel, exclude: options.exclude, signal,
        })
        signal.throwIfAborted()
        if (viewer.terrainProvider !== provider) throw new Error('地形已切换，请重新计算剖面。')
        let lowestPoint = samples[0]
        let highestPoint = samples[0]
        samples.forEach((point, index) => {
            point.height = heights[index]
            if (point.height < lowestPoint.height) lowestPoint = point
            if (point.height > highestPoint.height) highestPoint = point
        })
        return {
            samples, totalDistance, lowestPoint, highestPoint, source,
            terrainSource: provider instanceof EllipsoidTerrainProvider ? 'ellipsoid' : 'terrain',
        }
    })
}
