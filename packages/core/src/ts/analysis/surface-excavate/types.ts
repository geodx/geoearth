import type { WorldPosition } from '../../utils/coordinate/positions'

export interface SurfaceExcavateOptions {
    positions: readonly WorldPosition[]
    /** 坑底位于边界最低采样点之下 depth 米。 */
    depth?: number
    sampleTerrain?: boolean
    /** 边界采样最大间距，单位：米。 */
    spacing?: number
    bottomImage?: string
    sideImage?: string
}
