import { Cartesian2, Cesium3DTileFeature, Entity, Model, ModelFeature, type Viewer } from 'cesium'
import type { InteractionTarget, PickResult, ScenePickedObject } from './types'

/** 把 Cesium 原生结果和程序传入的对象归一化，不复制或替换原对象。 */
export function toPickResult(viewer: Viewer, target: InteractionTarget, position?: Cartesian2): PickResult {
    if ('object' in target && 'properties' in target && 'type' in target) return target as PickResult

    const raw = target as ScenePickedObject
    const entity = target instanceof Entity ? target : raw.id instanceof Entity ? raw.id
        : raw.primitive?.id instanceof Entity ? raw.primitive.id : undefined
    let result: PickResult
    if (target instanceof Cesium3DTileFeature || target instanceof ModelFeature) {
        const properties: Record<string, unknown> = {}
        for (const key of target.getPropertyIds()) properties[key] = target.getProperty(key)
        result = {
            type: 'feature', object: target,
            // ModelFeature 的 primitive 未出现在声明中，遵循 Scene.pick 的原生返回约定。
            primitive: target instanceof Cesium3DTileFeature ? target.tileset : raw.primitive,
            id: target.featureId, properties,
            name: String(properties.name ?? properties.title ?? properties.id ?? target.featureId)
        }
    } else if (entity) {
        result = {
            type: 'entity', object: entity, id: entity.id, name: entity.name,
            properties: entity.properties?.getValue(viewer.clock.currentTime) ?? {},
            primitive: raw.primitive
        }
    } else if (target instanceof Model || raw.primitive instanceof Model) {
        const model = target instanceof Model ? target : raw.primitive
        result = { type: 'model', object: model, primitive: model, id: raw.id, properties: {} }
    } else {
        result = { type: 'primitive', object: raw, primitive: raw.primitive, id: raw.id, properties: {} }
    }
    if (position) result.position = Cartesian2.clone(position)
    return result
}

/** Entity/模型按对象身份比较；Primitive 的同一实例按 primitive + id 比较。 */
export function samePick(left?: PickResult, right?: PickResult): boolean {
    if (!left || !right) return left === right
    return left.type === right.type && (left.type === 'primitive'
        ? left.primitive === right.primitive && left.id === right.id
        : left.object === right.object)
}

export function isPickAlive(result: PickResult): boolean {
    if (result.type === 'entity') {
        const entity = result.object
        return !entity.entityCollection || entity.entityCollection.contains(entity)
    }
    const primitive = result.primitive
    return !primitive?.isDestroyed?.()
}

/** 属性框只展示数据值，避免把资源属性中的 HTML 当作页面执行。 */
export function propertyDescription(properties: Record<string, unknown>): string {
    const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]))
    const rows = Object.entries(properties).map(([key, value]) =>
        `<tr><th>${escape(key)}</th><td>${escape(value)}</td></tr>`).join('')
    return `<table class="cesium-infoBox-defaultTable"><tbody>${rows}</tbody></table>`
}
