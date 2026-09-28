import type { Camera, ScreenSpaceEventHandler } from 'cesium'
import { SourceType } from '../sources/types'

/**
 * Viewer 生命周期事件。
 *
 * READY 不放在这里，因为构造完成前，外部无法注册监听。
 * 初始化完成统一使用 earth.ready。
 */
export enum ViewerEventType {
    RESIZE = 'resize',
    SHOW = 'show',
    HIDE = 'hide',
    DESTROY = 'destroy'
}

/**
 * 相机事件。
 */
export enum CameraEventType {
    CHANGE = 'change',
    MOVE_START = 'moveStart',
    MOVE_END = 'moveEnd',
    FLY_START = 'flyStart',
    FLY_END = 'flyEnd'
}

/**
 * 数据源变化类型。
 */
export enum SourceEventType {
    ADD = 'add',
    REMOVE = 'remove',
    CHANGE = 'change',
    SHOW = 'show',
    HIDE = 'hide'
}


/**
 * 配置变化类型。
 */
export enum ConfigEventType {
    LOAD = 'load',
    CHANGE = 'change',
    RESET = 'reset'
}

export interface ViewerEventPayload {
    type: ViewerEventType
    width?: number
    height?: number
}

export interface CameraEventPayload {
    type: CameraEventType
    camera: Camera
}

export interface SourceEventPayload<T = unknown> {
    type: SourceEventType
    sourceType: SourceType
    source: T
    id?: string
}

export interface ConfigEventPayload<T = unknown> {
    type: ConfigEventType
    config: Readonly<T>

    /**
     * CHANGE 事件发生时，记录发生变化的配置字段。
     */
    changedKeys?: string[]
}

/**
 * Cesium 屏幕事件参数。
 *
 * Cesium 不同 ScreenSpaceEventType 对应不同参数类型，
 * 这里使用联合类型兼容点击、移动、滚轮和双指操作。
 */
export type ScreenEventPayload =
    | ScreenSpaceEventHandler.PositionedEvent
    | ScreenSpaceEventHandler.MotionEvent
    | ScreenSpaceEventHandler.TwoPointEvent
    | ScreenSpaceEventHandler.TwoPointMotionEvent
    | number

export type EventCallback<T> = (payload: T) => void

export type RemoveCallback = () => void