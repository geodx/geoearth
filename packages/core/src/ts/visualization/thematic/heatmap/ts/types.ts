import type { WorldRectangle } from '../../../../viewer/types'
import type { HeatmapConfiguration } from './base/heatmap-types'

export interface HeatmapPoint {
    longitude: number
    latitude: number
    value: number
    /** 热力纹理中的半径，单位：像素。 */
    radius?: number
}

export type HeatmapStyle = Omit<HeatmapConfiguration, 'container'>

export interface HeatmapLayerOptions {
    points: readonly HeatmapPoint[]
    /** 支持 west > east 表示跨日期变更线；省略时根据数据计算范围。 */
    bounds?: WorldRectangle
    min?: number
    max?: number
    style?: HeatmapStyle
    renderType?: 'entity' | 'primitive' | 'imagery'
    height?: number
    /** 纹理宽高的最大尺寸，默认 1024。 */
    resolution?: number
    show?: boolean
}
