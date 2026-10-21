import type { ArcType, Color } from 'cesium'

export interface EntityLineOptions {
    clampToGround?: boolean
    arcType?: ArcType
}

export interface EntityAreaOptions {
    /** 默认贴地；false 时保留输入位置的高度。 */
    clampToGround?: boolean
    fillColor?: Color
    outlineColor?: Color
    width?: number
}
