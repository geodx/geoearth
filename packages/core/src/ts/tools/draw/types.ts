import type { Cartesian3, Cartographic, Color, HeightReference } from 'cesium'

export enum CoordinateType {
    CARTESIAN3 = 'cartesian3',
    CARTOGRAPHIC = 'cartographic',
    DEGREES = 'degrees'
}

export interface DegreePosition {
    longitude: number
    latitude: number
    height: number
}

export type DrawPosition<T extends CoordinateType> =
    T extends CoordinateType.CARTOGRAPHIC
    ? Cartographic
    : T extends CoordinateType.DEGREES
    ? DegreePosition
    : Cartesian3

export interface DrawPointOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> {
    coordinateType?: T
    showPreview?: boolean

    pixelSize?: number
    color?: Color
    outlineColor?: Color
    outlineWidth?: number
    heightReference?: HeightReference
    disableDepthTestDistance?: number

    onMove?: (position: DrawPosition<T>) => void
}


export interface DrawLineOptions<T extends CoordinateType = CoordinateType.CARTESIAN3> {
    coordinateType?: T
    width?: number
    color?: Color
    clampToGround?: boolean
    showVertex?: boolean
    onMove?: (positions: DrawPosition<T>[]) => void
}

export class DrawCancelledError extends Error {
    constructor(message = 'Drawing was cancelled.') {
        super(message)
        this.name = 'DrawCancelledError'
    }
}