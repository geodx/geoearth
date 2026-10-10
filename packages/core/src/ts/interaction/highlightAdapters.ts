import {
    Color, ColorBlendMode, ColorGeometryInstanceAttribute, ColorMaterialProperty,
    ConstantProperty, Entity, GroundPrimitive, Model, Primitive
} from 'cesium'
import type { HighlightAdapter } from './types'

/** Entity 的材质和颜色本身也是 Property，恢复时必须保留原引用和动态行为。 */
const entityAdapter: HighlightAdapter = {
    supports: result => result.type === 'entity',
    apply(result, color) {
        const entity = result.object as Entity
        const restore: (() => void)[] = []
        const replace = (graphics: object, key: string, value: unknown): void => {
            const fields = graphics as Record<string, unknown>
            const previous = fields[key]
            fields[key] = value
            restore.push(() => { if (fields[key] === value) fields[key] = previous })
        }
        for (const graphics of [entity.point, entity.billboard]) {
            if (graphics) replace(graphics, 'color', new ConstantProperty(color))
        }
        if (entity.label) {
            replace(entity.label, 'fillColor', new ConstantProperty(color))
            replace(entity.label, 'outlineColor', new ConstantProperty(color))
        }
        if (entity.model) {
            replace(entity.model, 'color', new ConstantProperty(color))
            replace(entity.model, 'colorBlendMode', new ConstantProperty(ColorBlendMode.REPLACE))
        }
        for (const graphics of [entity.polyline, entity.polygon, entity.rectangle, entity.ellipse,
            entity.ellipsoid, entity.box, entity.corridor, entity.wall, entity.polylineVolume]) {
            if (graphics) replace(graphics, 'material', new ColorMaterialProperty(color))
        }
        for (const graphics of [entity.point, entity.polygon, entity.rectangle, entity.ellipse,
            entity.ellipsoid, entity.box, entity.corridor, entity.wall]) {
            if (graphics) replace(graphics, 'outlineColor', new ConstantProperty(color))
        }
        return restore.length ? () => { for (const undo of restore) undo() } : undefined
    }
}

const modelAdapter: HighlightAdapter = {
    supports: result => result.type === 'model',
    apply(result, color) {
        const model = result.object as Model
        const originalColor = Color.clone(model.color)
        const blend = model.colorBlendMode
        model.color = color
        model.colorBlendMode = ColorBlendMode.REPLACE
        return () => { model.color = originalColor; model.colorBlendMode = blend }
    }
}

const featureAdapter: HighlightAdapter = {
    supports: result => result.type === 'feature',
    apply(result, color) {
        const feature = result.object as { color: Color }
        const original = Color.clone(feature.color)
        feature.color = color
        return () => { feature.color = original }
    }
}

const instanceAdapter: HighlightAdapter = {
    supports: result => result.type === 'primitive' && result.id !== undefined &&
        (result.primitive instanceof Primitive || result.primitive instanceof GroundPrimitive),
    apply(result, color) {
        const primitive = result.primitive as Primitive | GroundPrimitive
        if (!primitive.ready) return undefined
        const attributes = primitive.getGeometryInstanceAttributes(result.id)
        // 只有带实例 color 属性的几何才可直接改色；自定义着色器交给注册的适配器。
        if (!attributes?.color) return undefined
        const original = attributes.color.slice()
        attributes.color = ColorGeometryInstanceAttribute.toValue(color)
        return () => { attributes.color = original }
    }
}

const colorAdapter: HighlightAdapter = {
    supports: result => result.type === 'primitive' && result.primitive?.color instanceof Color,
    apply(result, color) {
        // Billboard、Label、PointPrimitive 等原生对象都有可写 color。
        const primitive = result.primitive as { color: Color }
        const original = Color.clone(primitive.color)
        primitive.color = color
        return () => { primitive.color = original }
    }
}

export const defaultHighlightAdapters: HighlightAdapter[] = [
    entityAdapter, featureAdapter, modelAdapter, instanceAdapter, colorAdapter
]
