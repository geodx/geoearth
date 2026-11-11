import { Cartesian3, EllipsoidTerrainProvider, IntersectionTests, Math as CesiumMath, Ray } from 'cesium'
import { toCartesian, type WorldPosition } from '../../utils/coordinate/positions'
import { sampleHeights } from '../../utils/scene/heights'
import { runSceneTask } from '../../utils/scene/runSceneTask'
import type { SceneHost } from '../../utils/scene/types'
import { sceneIntersection } from './sceneIntersection'
import type { LineOfSightObstruction, LineOfSightOptions, LineOfSightResult } from './types'

/** 检查两点间的三维直线，包括地球曲率、地形和可选的场景对象。 */
export async function computeLineOfSight(
    host: SceneHost, observerPosition: WorldPosition, targetPosition: WorldPosition, options: LineOfSightOptions = {},
): Promise<LineOfSightResult> {
    const viewer = 'viewer' in host ? host.viewer : host
    if (viewer.isDestroyed()) throw new Error('Viewer has been destroyed.')
    options.signal?.throwIfAborted()
    const spacing = options.sampleSpacing ?? 30
    const maxSamples = options.maxSamples ?? 4096
    const tolerance = options.tolerance ?? 0.1
    const source = options.source ?? 'surface'
    const observerHeight = options.observerHeight ?? 0
    const targetHeight = options.targetHeight ?? 0
    if (!Number.isFinite(spacing) || spacing <= 0 || !Number.isFinite(tolerance) || tolerance <= 0) {
        throw new RangeError('通视采样间距和容差必须为正数。')
    }
    if (!Number.isSafeInteger(maxSamples) || maxSamples < 3) throw new RangeError('通视采样上限必须为至少 3 的整数。')
    if (![observerHeight, targetHeight].every(Number.isFinite)) throw new RangeError('通视附加高度必须为有限数值。')
    if (source !== 'terrain' && source !== 'surface') throw new RangeError('通视来源必须为 terrain 或 surface。')
    if (options.terrainLevel !== undefined && (!Number.isInteger(options.terrainLevel) || options.terrainLevel < 0 || options.terrainLevel > 30)) {
        throw new RangeError('地形采样级别必须是 0 到 30 之间的整数。')
    }
    const ellipsoid = viewer.scene.globe.ellipsoid
    const offset = (position: WorldPosition, height: number) => {
        const cartesian = toCartesian(position, ellipsoid)
        if (!ellipsoid.cartesianToCartographic(cartesian)) throw new RangeError('通视端点必须能转换为地理坐标。')
        const normal = ellipsoid.geodeticSurfaceNormal(cartesian, new Cartesian3())
        return Cartesian3.add(cartesian, Cartesian3.multiplyByScalar(normal, height, normal), cartesian)
    }
    const observer = offset(observerPosition, observerHeight)
    const target = offset(targetPosition, targetHeight)
    const distance = Cartesian3.distance(observer, target)
    if (!Number.isFinite(distance) || distance < 1e-6) throw new RangeError('通视两端必须为不同位置。')
    const count = Math.min(maxSamples - 1, Math.max(2, Math.ceil(distance / spacing)))
    const provider = viewer.terrainProvider
    const excluded = [...(options.exclude ?? [])]

    return runSceneTask(host, options.signal, async (viewer, signal) => {
        const terrainIntersection = async (): Promise<LineOfSightObstruction | undefined> => {
            if (provider instanceof EllipsoidTerrainProvider) {
                const direction = Cartesian3.normalize(Cartesian3.subtract(target, observer, new Cartesian3()), new Cartesian3())
                const interval = IntersectionTests.rayEllipsoid(new Ray(observer, direction), ellipsoid)
                if (!interval || interval.stop <= tolerance || interval.start >= distance - tolerance) return undefined
                const middle = (Math.max(0, interval.start) + Math.min(distance, interval.stop)) / 2
                const point = Cartesian3.add(observer, Cartesian3.multiplyByScalar(direction, middle, new Cartesian3()), new Cartesian3())
                const depth = ellipsoid.cartesianToCartographic(point)?.height
                if (depth !== undefined && depth >= -tolerance) return undefined
                const along = Math.max(0, interval.start)
                return {
                    position: Cartesian3.add(observer, Cartesian3.multiplyByScalar(direction, along, new Cartesian3()), new Cartesian3()),
                    distance: along, source: 'terrain',
                }
            }
            const at = (fraction: number) => {
                const position = Cartesian3.lerp(observer, target, fraction, new Cartesian3())
                const point = ellipsoid.cartesianToCartographic(position)
                if (!point) throw new RangeError('视线经过椭球中心，无法进行地形高度采样。')
                return {
                    longitude: CesiumMath.toDegrees(point.longitude), latitude: CesiumMath.toDegrees(point.latitude), height: point.height,
                }
            }
            const points = Array.from({ length: count + 1 }, (_, index) => at(index / count))
            const sampling = { mode: 'terrain' as const, terrainLevel: options.terrainLevel, signal }
            const heights = await sampleHeights(viewer, points, sampling)
            signal.throwIfAborted()
            const index = points.findIndex((point, index) => point.height < heights[index] - tolerance)
            if (index < 0) return undefined
            let low = Math.max(0, index - 1) / count
            let high = index / count
            for (let iteration = 0; iteration < 12 && (high - low) * distance > tolerance; iteration++) {
                const middle = (low + high) / 2
                const point = at(middle)
                const [height] = await sampleHeights(viewer, [point], sampling)
                signal.throwIfAborted()
                if (point.height < height - tolerance) high = middle
                else low = middle
            }
            return { position: Cartesian3.lerp(observer, target, high, new Cartesian3()), distance: high * distance, source: 'terrain' }
        }
        const [terrain, scene] = await Promise.all([
            terrainIntersection(),
            source === 'surface' ? sceneIntersection(viewer, observer, target, excluded, tolerance, signal) : undefined,
        ])
        signal.throwIfAborted()
        if (viewer.terrainProvider !== provider) throw new Error('地形已切换，请重新计算通视。')
        let obstruction = terrain
        if (scene && (!obstruction || scene.distance < obstruction.distance)) obstruction = scene
        return {
            observer, target, distance, visible: !obstruction, obstruction, source,
            terrainSource: provider instanceof EllipsoidTerrainProvider ? 'ellipsoid' : 'terrain',
            sampleSpacing: provider instanceof EllipsoidTerrainProvider ? 0 : distance / count,
        }
    })
}
