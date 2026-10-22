import { Cartesian3, Cartographic, Color, Cesium3DTileStyle, Matrix4, Transforms, type Cesium3DTileset, type Cesium3DTileFeature } from 'cesium'

function translate(tileset: Cesium3DTileset, from: Cartesian3, to: Cartesian3): void {
    const offset = Cartesian3.subtract(to, from, new Cartesian3())
    const translation = Matrix4.fromTranslation(offset)
    tileset.modelMatrix = Matrix4.multiply(translation, tileset.modelMatrix, new Matrix4())
}

/** 保留原接口单位：lon/lat 为弧度增量，height 为米；叠加平移时保留已有旋转与缩放。 */
export function offSetTileSetByCartographic(tileset: Cesium3DTileset, lon = 0, lat = 0, height = 0): void {
    if (![lon, lat, height].every(Number.isFinite)) throw new RangeError('模型偏移必须为有限数值。')
    const center = tileset.boundingSphere.center
    const location = Cartographic.fromCartesian(center)
    const target = Cartesian3.fromRadians(location.longitude + lon, location.latitude + lat, location.height + height)
    translate(tileset, center, target)
}

/** 目标经纬度以度计，高度为米；在原模型矩阵上叠加局部坐标系变换。 */
export function changeTileSetRootPosition(tileset: Cesium3DTileset, longitude: number, latitude: number, height: number): void {
    if (![longitude, latitude, height].every(Number.isFinite) || Math.abs(latitude) > 90) throw new RangeError('无效的模型目标位置。')
    const from = Transforms.eastNorthUpToFixedFrame(tileset.boundingSphere.center)
    const to = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(longitude, latitude, height))
    const relocation = Matrix4.multiply(to, Matrix4.inverseTransformation(from, new Matrix4()), new Matrix4())
    tileset.modelMatrix = Matrix4.multiply(relocation, tileset.modelMatrix, new Matrix4())
}

/** 设置中心的绝对椭球高度，保留原有旋转和缩放。 */
export function setTileSetHeight(tileset: Cesium3DTileset, height: number): void {
    if (!Number.isFinite(height)) throw new RangeError('模型高度必须为有限数值。')
    const center = tileset.boundingSphere.center
    const location = Cartographic.fromCartesian(center)
    translate(tileset, center, Cartesian3.fromRadians(location.longitude, location.latitude, height))
}

interface OpacityState { previous?: Cesium3DTileStyle; applied: Cesium3DTileStyle; alpha: number }
const opacity = new WeakMap<Cesium3DTileset, OpacityState>()

/** 乘以原有颜色透明度，不丢失分要素颜色、显隐或其他样式规则。 */
export function setAlpha(tileset: Cesium3DTileset, alpha: number): void {
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new RangeError('透明度须在 [0,1]。')
    const state = opacity.get(tileset)
    const previous = state && state.applied === tileset.style ? state.previous : tileset.style
    const originalColor = previous?.color
    const expression = previous?.style.color
    const multiply = (value: string) => `(${value}) * vec4(1.0, 1.0, 1.0, ${alpha})`
    let color: unknown
    // 普通表达式继续交给 Cesium 编译，保留点云等内容的 GPU 样式能力。
    if (typeof expression === 'string') color = multiply(expression)
    else if (expression?.conditions) color = { conditions: expression.conditions.map(([condition, value]: [string, string]) => [condition, multiply(value)]) }
    else if (!originalColor) color = multiply('color("white")')
    else color = {
        evaluateColor(feature: Cesium3DTileFeature, result?: Color) {
            const evaluated = originalColor.evaluateColor(feature, result)
            const output = Color.clone(evaluated ?? Color.WHITE, result)
            output.alpha *= alpha
            return output
        },
    }
    const applied = new Cesium3DTileStyle({ ...previous?.style, color })
    tileset.style = applied
    opacity.set(tileset, { previous, applied, alpha })
}

/** 返回由本工具设置的透明度；未接管样式时返回 1。 */
export function getAlpha(tileset: Cesium3DTileset): number {
    const state = opacity.get(tileset)
    return state && state.applied === tileset.style ? state.alpha : 1
}

export function restoreTilesetStyle(tileset: Cesium3DTileset): void {
    const state = opacity.get(tileset)
    if (state && state.applied === tileset.style) tileset.style = state.previous
    opacity.delete(tileset)
}
