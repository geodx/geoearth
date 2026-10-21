import type { Cartesian3 } from 'cesium'
import type { DrawHeightResult } from '../draw/types'

export enum ElevationTarget {
    /**
     * 测量地形、3D Tiles 或场景表面的高程。
     */
    SURFACE = 'surface',

    /**
     * 只测量地形高程。
     */
    TERRAIN = 'terrain'
}

export enum ElevationSource {
    SCENE = 'scene',
    TERRAIN = 'terrain',
    PICKED = 'picked',
    ELLIPSOID = 'ellipsoid'
}

export interface MeasureOptions {
    /** 是否保留结果实体和标注，默认 true。 */
    showResult?: boolean
    /** 标注小数位数，默认 2；不影响返回值精度。 */
    fractionDigits?: number
}

export interface PointElevationOptions extends MeasureOptions {
    target?: ElevationTarget
}

export interface GroundDistanceOptions extends MeasureOptions {
    /** 沿椭球测地线加密的目标间距，单位米，默认 30。 */
    sampleSpacing?: number
    /** 总采样点数上限，默认 4096；至少保留全部控制点。 */
    maxSamples?: number
}

export interface PointElevationResult {
    id: string
    type: 'point-height'
    pickedPosition: Cartesian3
    position: Cartesian3
    longitude: number
    latitude: number
    height: number
    source: ElevationSource
}

export interface SpaceDistanceResult {
    id: string
    type: 'space-distance'
    positions: Cartesian3[]
    /** 相邻点三维直线距离之和，单位米。 */
    distance: number
    segmentLengths: number[]
}

export interface GroundDistanceResult {
    id: string
    type: 'ground-distance'
    positions: Cartesian3[]
    sampledPositions: Cartesian3[]
    /** 地形采样后折线长度，单位米；精度受采样间距和地形精度影响。 */
    distance: number
    sources: ElevationSource[]
}

export interface AreaResult {
    id: string
    type: 'area'
    /** 不重复首点的边界。 */
    positions: Cartesian3[]
    /** Turf 球面面积，单位平方米；忽略高度，不是地形起伏表面积。 */
    area: number
    /** 闭合边界的椭球测地线长度，单位米，不含高度。 */
    perimeter: number
}

export interface PerimeterResult {
    id: string
    type: 'perimeter'
    positions: Cartesian3[]
    /** 闭合边界的椭球测地线长度，单位米，不含高度。 */
    perimeter: number
}

export interface HeightDifferenceResult extends DrawHeightResult {
    id: string
    type: 'height-difference'
    /** 高差绝对值，单位米；有符号值见 heightDifference。 */
    distance: number
}

export interface AngleResult {
    id: string
    type: 'angle'
    /** 起点、角顶点、终点。 */
    positions: [Cartesian3, Cartesian3, Cartesian3]
    /** 三维向量夹角，单位度，范围 0～180。 */
    angle: number
}

export interface TriangleDistanceResult {
    id: string
    type: 'triangle-distance'
    positions: [Cartesian3, Cartesian3]
    corner: Cartesian3
    /** 两点的三维直线距离，单位米。 */
    distance: number
    /** 起点局部切平面内的距离，单位米。 */
    horizontalDistance: number
    /** 沿起点椭球法线的有符号距离，单位米；与椭球高差不同。 */
    verticalDistance: number
}

export type MeasureResult = PointElevationResult | SpaceDistanceResult | GroundDistanceResult |
    AreaResult | PerimeterResult | HeightDifferenceResult | AngleResult | TriangleDistanceResult

export class MeasureCancelledError extends Error {
    constructor(message = 'Measurement was cancelled.') {
        super(message)
        this.name = 'MeasureCancelledError'
    }
}
