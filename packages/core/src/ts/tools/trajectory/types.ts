import type { Cartesian3, Color, Entity, JulianDate, LabelGraphics, MaterialProperty, ModelGraphics } from 'cesium'
import type { WorldPosition } from '../../utils/coordinate/positions'

export type TrajectoryState = 'idle' | 'playing' | 'paused' | 'completed'

export interface TrajectorySample {
    position: WorldPosition
    /** 全部采样点提供时间戳，或全部省略；省略时按 speed 计算时长。 */
    time?: JulianDate | string
}

export interface TrajectoryOptions {
    /** 无时间戳轨迹的速度，单位：米/秒，默认 10。 */
    speed?: number
    multiplier?: number
    loop?: boolean
    showPath?: boolean
    /** 显示最近多少秒的尾迹；省略时显示完整路线。 */
    trailTime?: number
    pathWidth?: number
    pathMaterial?: Color | MaterialProperty
    /** 借用已有实体；销毁时恢复仍由播放器持有的位置、朝向属性。 */
    entity?: Entity
    model?: ModelGraphics.ConstructorOptions
    label?: LabelGraphics.ConstructorOptions
    projection?: {
        length?: number
        topRadius?: number
        bottomRadius?: number
        color?: Color
    }
}

/** 每次位置更新后的结果，供相机漫游等功能跟随；坐标单位为米。 */
export interface TrajectoryFrame {
    position: Cartesian3
    direction?: Cartesian3
    time: number
}
