import { Cartographic, EllipsoidTerrainProvider, sampleTerrain, sampleTerrainMostDetailed, type Viewer } from 'cesium'
import { toCartesian } from '../coordinate/positions'
import type { WorldDegree } from '../../viewer/types'

export interface HeightSamplingOptions {
    mode?: 'terrain' | 'surface'
    exclude?: object[]
    /** 显式地形采样级别，省略时优先最高精度，其次使用当前已加载地形。 */
    terrainLevel?: number
    signal?: AbortSignal
}

/** 批量采样并保持输入顺序；模型缺失的位置逐点回退到地形，零高度和负高度均有效。 */
export async function sampleHeights(viewer: Viewer, positions: readonly WorldDegree[], options: HeightSamplingOptions = {}): Promise<number[]> {
    options.signal?.throwIfAborted()
    if (options.terrainLevel !== undefined && (!Number.isInteger(options.terrainLevel) || options.terrainLevel < 0 || options.terrainLevel > 30)) {
        throw new RangeError('地形采样级别必须是 0 到 30 之间的整数。')
    }
    if (!positions.length) return []
    const ellipsoid = viewer.scene.globe.ellipsoid
    const provider = viewer.terrainProvider
    const cartesian = positions.map(position => toCartesian(position, ellipsoid))
    const surfaces = options.mode !== 'terrain' && viewer.scene.clampToHeightSupported
        ? await viewer.scene.clampToHeightMostDetailed(cartesian, options.exclude ?? [])
        : []
    options.signal?.throwIfAborted()
    const heights = positions.map((_position, index) => {
        const surface = surfaces[index]
        return surface ? ellipsoid.cartesianToCartographic(surface).height : undefined
    })
    const missing = positions.map((_position, index) => index).filter(index => !Number.isFinite(heights[index]))
    const terrain = missing.map(index => Cartographic.fromDegrees(positions[index].longitude, positions[index].latitude))
    if (!terrain.length) return heights as number[]
    if (provider instanceof EllipsoidTerrainProvider) {
        terrain.forEach(position => { position.height = 0 })
    } else if (options.terrainLevel !== undefined) {
        await sampleTerrain(provider, options.terrainLevel, terrain)
    } else if (provider.availability) {
        await sampleTerrainMostDetailed(provider, terrain)
    } else {
        terrain.forEach(position => { position.height = viewer.scene.globe.getHeight(position) })
    }
    options.signal?.throwIfAborted()
    terrain.forEach((position, offset) => {
        const index = missing[offset]
        if (!Number.isFinite(position.height)) throw new Error(`第 ${index + 1} 个位置的地表高度不可用。`)
        heights[index] = position.height
    })
    return heights as number[]
}

export async function getTerrainMostDetailedHeight(viewer: Viewer, longitude: number, latitude: number): Promise<number> {
    const heights = await sampleHeights(viewer, [{ longitude, latitude, height: 0 }], { mode: 'terrain' })
    return heights[0]
}

/** 返回新的坐标数组，不改变传入位置；输入高度只用于模型表面查询。 */
export async function getMostDetailedHeight(viewer: Viewer, positions: readonly WorldDegree[]): Promise<WorldDegree[]> {
    const heights = await sampleHeights(viewer, positions)
    return positions.map((position, index) => ({ ...position, height: heights[index] }))
}
