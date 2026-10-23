import type { WorldDegree } from '../../viewer/types'
import type { TrajectoryState } from '../../tools/trajectory/types'

export type RoamingView = 'thirdPerson' | 'firstPerson' | 'none'
/** 路径漫游的播放状态。 */
export type RoamingState = TrajectoryState

export interface PathRoamingOptions {
    /** 速度，单位：米/秒，默认 10。 */
    speed?: number
    /** 播放倍率，默认 1。 */
    multiplier?: number
    loop?: boolean
    showPath?: boolean
    view?: RoamingView
    /** 第三人称俯仰角，单位：度，默认 -30。 */
    pitch?: number
    /** 第三人称跟随距离，单位：米，默认 100。 */
    range?: number
    /** 第一人称视点相对路线的高度，单位：米，默认 1.7。 */
    eyeHeight?: number
    model?: { uri: string; scale?: number; minimumPixelSize?: number }
}

export interface PrepareRoamingPathOptions {
    /** 保留输入椭球高、采样地形，或优先使用模型表面高度；默认 surface。 */
    heightMode?: 'absolute' | 'terrain' | 'surface'
    /** 叠加到采样高度的偏移，单位：米，默认 0。 */
    heightOffset?: number
    /** 地形或模型表面的采样间距，单位：米，默认 30。 */
    sampleSpacing?: number
    /** 路线加密后的采样点上限，默认 4096。 */
    maxSamples?: number
}

export type RoamingPosition = WorldDegree
