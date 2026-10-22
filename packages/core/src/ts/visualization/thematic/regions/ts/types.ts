import type { Cartesian2, Color, LabelGraphics, MaterialProperty } from 'cesium'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { VisualizationPosition } from '../../../types'

export type RegionFeature = Feature<Polygon | MultiPolygon>

export type RegionData = FeatureCollection<Polygon | MultiPolygon> | readonly RegionFeature[]

export interface RegionStyle {
    fillColor?: Color
    fillMaterial?: MaterialProperty
    fillImage?: string
    fillRepeat?: Cartesian2
    gradient?: boolean
    outlineColor?: Color
    outlineMaterial?: MaterialProperty
    outlineHeight?: number
    outlineWidth?: number
    height?: number
    extrudedHeight?: number
    /** 保留几何顶点各自的高度，启用后不再使用统一高度。 */
    perPositionHeight?: boolean
    wallImage?: string
    wallColor?: Color
    wallRepeat?: Cartesian2
    labelText?: string
    labelPosition?: VisualizationPosition
    label?: LabelGraphics.ConstructorOptions
}

export interface RegionLayerOptions {
    data: RegionData
    /** administrative 使用网格面与渐变边墙；仍可通过 style 覆盖。 */
    theme?: 'plain' | 'administrative'
    style?: RegionStyle | ((feature: RegionFeature, index: number) => RegionStyle)
    labelProperty?: string
    showLabels?: boolean
    show?: boolean
}
