import type { WorldDegree } from '../../viewer/types'

export interface ProfileOptions {
    /** 目标采样间距，单位米，默认 30；达到数量上限时自动增大。 */
    sampleSpacing?: number
    /** 总采样点数上限，默认 4096，至少容纳全部不同的路径控制点。 */
    maxSamples?: number
    /** 默认 terrain；surface 查询模型表面，缺失处逐点回退到地形。 */
    source?: 'terrain' | 'surface'
    /** 显式地形采样级别，适用于无 availability 的自定义地形；省略时沿用高度查询策略。 */
    terrainLevel?: number
    /** 场景表面查询时排除的对象，例如剖面线和定位标记。 */
    exclude?: object[]
    signal?: AbortSignal
}

export interface ProfileSample extends WorldDegree {
    /** 从起点沿路径累计的椭球水平距离，单位米。 */
    distance: number
}

export interface ProfileResult {
    samples: ProfileSample[]
    totalDistance: number
    lowestPoint: ProfileSample
    highestPoint: ProfileSample
    /** 请求的采样模式。 */
    source: 'terrain' | 'surface'
    /** 地形采样或模型缺失处回退使用的地面来源。椭球地形高度为 0。 */
    terrainSource: 'terrain' | 'ellipsoid'
}
