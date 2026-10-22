import type { Color, PolygonHierarchy } from 'cesium'
import type { WorldPosition } from '../../utils/coordinate/positions'

export interface HeightLimitOptions {
    hierarchy: PolygonHierarchy | readonly WorldPosition[]
    /** 限高阈值与上界均为绝对椭球高度，单位：米。 */
    height: number
    upperHeight?: number
    color?: Color
}
