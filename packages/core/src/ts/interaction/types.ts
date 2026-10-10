import type { Cartesian2, Cesium3DTileFeature, Color, Entity, Model, ModelFeature } from 'cesium'

/** Scene.pick 返回的普通对象；id 可以是 Entity，也可以是几何实例的 ID。 */
export interface ScenePickedObject {
    primitive: any
    id?: unknown
}

export type PickObjectType = 'entity' | 'feature' | 'model' | 'primitive'

interface PickResultInfo {
    id?: unknown
    name?: string
    properties: Record<string, unknown>
    /** 仅屏幕拾取结果有此值，单位为画布内的 CSS 像素。 */
    position?: Cartesian2
}

/** 根据 type 推导 object 的原生类型；properties 是拾取时读取的属性快照。 */
export type PickResult = PickResultInfo & (
    | { type: 'entity'; object: Entity; primitive?: any }
    | { type: 'feature'; object: Cesium3DTileFeature | ModelFeature; primitive: any }
    | { type: 'model'; object: Model; primitive: Model }
    | { type: 'primitive'; object: ScenePickedObject; primitive: any }
)

export type InteractionTarget = PickResult | Entity | Cesium3DTileFeature | ModelFeature | Model | ScenePickedObject
export type HighlightColor = Color | string

export interface InteractionOptions {
    /** 默认启用悬停和点击选中。 */
    hover?: boolean
    select?: boolean
    hoverColor?: HighlightColor
    selectColor?: HighlightColor
    /** 返回 false 的对象被忽略；会继续寻找后方符合条件的对象。 */
    filter?: (result: PickResult) => boolean
}

export enum InteractionEventType {
    HOVER_CHANGE = 'hoverChange',
    SELECT_CHANGE = 'selectChange',
    HIGHLIGHT_CHANGE = 'highlightChange'
}

export interface InteractionEventPayload {
    type: InteractionEventType
    previous?: PickResult
    current?: PickResult
}

/** 自定义渲染对象可注册适配器；返回的函数负责恢复原样式。 */
export interface HighlightAdapter {
    supports(result: PickResult): boolean
    /** 无法高亮（例如 Primitive 尚未 ready）时返回 undefined。 */
    apply(result: PickResult, color: Color): (() => void) | undefined
}
