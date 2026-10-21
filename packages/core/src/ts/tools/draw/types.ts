import type { Cartesian2, Cartesian3, Cartographic, Color, HeightReference } from 'cesium'
import type { WorldDegree } from '../../viewer/types'

export enum CoordinateType {
    CARTESIAN3 = 'cartesian3',
    CARTOGRAPHIC = 'cartographic',
    DEGREES = 'degrees'
}

/** 角度制经纬度；height 为椭球高（米），与 SDK 的 WorldDegree 保持一致。 */
export type DegreePosition = WorldDegree

export interface DrawPositionMap {
    [CoordinateType.CARTESIAN3]: Cartesian3
    [CoordinateType.CARTOGRAPHIC]: Cartographic
    [CoordinateType.DEGREES]: DegreePosition
}

export type DrawPosition<T extends CoordinateType = CoordinateType.CARTESIAN3> = DrawPositionMap[T]

/** 默认 Cartesian3 可省略 coordinateType，其他格式必须显式指定。 */
export type DrawCoordinateOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    [T] extends [CoordinateType.CARTESIAN3] ? { coordinateType?: T } : { coordinateType: T }

export interface DrawPointStyle {
    showPreview?: boolean
    pixelSize?: number
    color?: Color
    outlineColor?: Color
    outlineWidth?: number
    heightReference?: HeightReference
    disableDepthTestDistance?: number
}

export interface DrawPathStyle {
    /** 仅控制临时图形；不影响坐标返回及 onMove。默认 true。 */
    showPreview?: boolean
    width?: number
    color?: Color
    /** 只影响预览显示，返回值仍保留拾取位置的高度。线默认 false，面默认 true。 */
    clampToGround?: boolean
    showVertex?: boolean
}

export interface DrawAreaStyle extends DrawPathStyle {
    fillColor?: Color
    outlineColor?: Color
}

export type DrawPointOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    DrawCoordinateOptions<T> & DrawPointStyle & { onMove?: (position: DrawPosition<T>) => void }

export type DrawLineResult<T extends CoordinateType = CoordinateType.CARTESIAN3> = [DrawPosition<T>, DrawPosition<T>]
export type DrawTriangleResult<T extends CoordinateType = CoordinateType.CARTESIAN3> = [DrawPosition<T>, DrawPosition<T>, DrawPosition<T>]
/** 起点、角顶点、终点；不包含量测角度值。 */
export type DrawAngleResult<T extends CoordinateType = CoordinateType.CARTESIAN3> = [DrawPosition<T>, DrawPosition<T>, DrawPosition<T>]
/** 四个角按边界顺序排列，不重复首点。 */
export type DrawRectangleResult<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    [DrawPosition<T>, DrawPosition<T>, DrawPosition<T>, DrawPosition<T>]

/** 移动预览可能尚不足两个点，因此 onMove 接收普通数组，最终结果为两点元组。 */
export type DrawLineOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    DrawCoordinateOptions<T> & DrawPathStyle & { onMove?: (positions: DrawPosition<T>[]) => void }
export type DrawPolylineOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> = DrawLineOptions<T>
export type DrawAngleOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> = DrawLineOptions<T>
export type DrawPolygonOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    DrawCoordinateOptions<T> & DrawAreaStyle & { onMove?: (positions: DrawPosition<T>[]) => void }
export type DrawRectangleOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> = DrawPolygonOptions<T>
export type DrawTriangleOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> = DrawPolygonOptions<T>

export interface DrawCircleResult<T extends CoordinateType = CoordinateType.CARTESIAN3> {
    center: DrawPosition<T>
    endPoint: DrawPosition<T>
    /** 圆心与圆周控制点之间的椭球面距离，单位：米；不含高差。 */
    radius: number
}
export type DrawCircleOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    DrawCoordinateOptions<T> & DrawAreaStyle & { onMove?: (circle: DrawCircleResult<T>) => void }

export interface DrawHeightResult<T extends CoordinateType = CoordinateType.CARTESIAN3> {
    start: DrawPosition<T>
    /** 与 start 同经纬度，高度取第二个拾取位置；用于绘制竖直高差线。 */
    end: DrawPosition<T>
    pickedEnd: DrawPosition<T>
    /** end 与 start 的有符号椭球高差，单位：米。 */
    heightDifference: number
}
export type DrawHeightOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> =
    DrawCoordinateOptions<T> & Omit<DrawPathStyle, 'clampToGround'> & { onMove?: (height: DrawHeightResult<T>) => void }

/** 拖动的是实体局部坐标系中的平面距离，不是地理纬度。 */
export interface DrawPlaneOptions {
    position: Cartesian3
    normal: Cartesian3
    dimensions: Cartesian2
    distance?: number
    /** 鼠标竖直移动一像素对应的米数，默认 1。 */
    metersPerPixel?: number
    color?: Color
    onMove?: (plane: DrawPlaneResult) => void
}
export interface DrawPlaneResult {
    position: Cartesian3
    normal: Cartesian3
    distance: number
}

export class DrawCancelledError extends Error {
    constructor(message = 'Drawing was cancelled.') {
        super(message)
        this.name = 'DrawCancelledError'
    }
}
