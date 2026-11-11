import type { Cartesian3 } from 'cesium'

export interface LineOfSightOptions {
    /** 默认 surface，同时检查地形和场景对象；terrain 仅检查地形。 */
    source?: 'terrain' | 'surface'
    /** 沿输入位置的椭球法线附加高度，单位米，默认 0。 */
    observerHeight?: number
    targetHeight?: number
    /** 初次地形采样目标间距，单位米，默认 30。 */
    sampleSpacing?: number
    /** 初次地形采样点数上限，默认 4096，至少为 3；定位首个遮挡点时最多追加 12 次采样。 */
    maxSamples?: number
    terrainLevel?: number
    /** 地形穿透与端点接触的容差，单位米，默认 0.1。 */
    tolerance?: number
    /** 场景射线查询时排除的实体、图元或 3D Tiles 要素。 */
    exclude?: object[]
    signal?: AbortSignal
}

export interface LineOfSightObstruction {
    position: Cartesian3
    /** 沿三维视线距观察点的距离，单位米。 */
    distance: number
    source: 'terrain' | 'scene'
    /** scene 遮挡返回的 Cesium 拾取对象。 */
    object?: unknown
}

export interface LineOfSightResult {
    observer: Cartesian3
    target: Cartesian3
    /** 三维直线距离，单位米。 */
    distance: number
    visible: boolean
    obstruction?: LineOfSightObstruction
    source: 'terrain' | 'surface'
    terrainSource: 'terrain' | 'ellipsoid'
    /** 初次地形检查的实际三维采样间距，单位米。 */
    sampleSpacing: number
}
