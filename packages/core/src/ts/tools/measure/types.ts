import type { Cartesian3 } from 'cesium'

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

export interface PointElevationOptions {
    target?: ElevationTarget
    showResult?: boolean
    fractionDigits?: number
}

export interface PointElevationResult {
    id: string
    pickedPosition: Cartesian3
    position: Cartesian3
    longitude: number
    latitude: number
    height: number
    source: ElevationSource
}

export class MeasureCancelledError extends Error {
    constructor(message = 'Measurement was cancelled.') {
        super(message)
        this.name = 'MeasureCancelledError'
    }
}