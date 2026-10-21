import type { WorldDegree } from '../../viewer/types'

export type RoamingView = 'thirdPerson' | 'firstPerson' | 'none'
export type RoamingState = 'idle' | 'playing' | 'paused' | 'completed'

export interface PathRoamingOptions {
    /** Meters per second, defaults to 10. */
    speed?: number
    /** Playback multiplier, defaults to 1. */
    multiplier?: number
    loop?: boolean
    showPath?: boolean
    view?: RoamingView
    /** Third-person angle in degrees, defaults to -30. */
    pitch?: number
    /** Third-person distance in meters, defaults to 100. */
    range?: number
    /** First-person eye height above the path, defaults to 1.7 meters. */
    eyeHeight?: number
    model?: { uri: string; scale?: number; minimumPixelSize?: number }
}

export interface PrepareRoamingPathOptions {
    /** Keep input ellipsoid heights, sample terrain, or prefer model surfaces. Default: surface. */
    heightMode?: 'absolute' | 'terrain' | 'surface'
    /** Added to each resulting height, in meters. Default: 0. */
    heightOffset?: number
    /** Terrain/surface sample spacing, defaults to 30 meters. */
    sampleSpacing?: number
    /** Upper bound for densified samples, defaults to 4096. */
    maxSamples?: number
}

export type RoamingPosition = WorldDegree
