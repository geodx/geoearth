import type { Color, ImageryLayer } from 'cesium'

export type OverviewMapPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface OverviewMapOptions {
    container?: string | HTMLElement
    position?: OverviewMapPosition
    width?: number | string
    height?: number | string

    baseLayer?: ImageryLayer | false

    /**
     * 鹰眼范围相对于主视图范围的倍数。
     */
    scaleFactor?: number

    /**
     * 主相机变化检测间隔，单位毫秒。
     */
    updateInterval?: number

    /**
     * 红框小于鹰眼宽度或高度的该比例时，重新调整鹰眼缩放。
     */
    minBoxRatio?: number

    /**
     * 红框大于鹰眼宽度或高度的该比例时，重新调整鹰眼缩放。
     */
    maxBoxRatio?: number

    /**
     * 红框距离鹰眼边缘小于该像素值时，重新居中鹰眼。
     */
    edgePadding?: number

    fillColor?: Color
    outlineColor?: Color
}