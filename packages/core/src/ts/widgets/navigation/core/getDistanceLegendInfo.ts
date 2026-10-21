import { Cartesian2, EllipsoidGeodesic, type Viewer } from 'cesium'

interface DistanceLegendInfo {
    /** 比例尺线段表示的距离，单位为米。 */
    distance: number
    /** 比例尺线段的长度，单位为 CSS 像素。 */
    width: number
    label: string
    /** 画布底部中心处，每个 CSS 像素对应的地表距离，单位为米。 */
    metersPerPixel: number
}

/**
 * 计算画布底部中心处的局部比例尺。
 * 仅使用已加载的地球和地形数据；透视视图中的不同位置具有不同的比例尺。
 */
export function getDistanceLegendInfo(viewer: Viewer, maxWidth = 100): DistanceLegendInfo | undefined {
    if (!Number.isFinite(maxWidth) || maxWidth <= 0) throw new RangeError('maxWidth must be positive')
    if (viewer.isDestroyed()) return undefined
    const { scene, camera } = viewer
    const { clientWidth: width, clientHeight: height } = scene.canvas
    const globe = scene.globe
    if (!globe || width < 2 || height < 1) return undefined

    const x = Math.floor(width / 2)
    const leftRay = camera.getPickRay(new Cartesian2(x - 1, height - 1))
    const rightRay = camera.getPickRay(new Cartesian2(x, height - 1))
    if (!leftRay || !rightRay) return undefined
    const left = globe.pick(leftRay, scene)
    const right = globe.pick(rightRay, scene)
    if (!left || !right) return undefined
    const a = globe.ellipsoid.cartesianToCartographic(left)
    const b = globe.ellipsoid.cartesianToCartographic(right)
    if (!a || !b) return undefined
    const metersPerPixel = new EllipsoidGeodesic(a, b, globe.ellipsoid).surfaceDistance
    if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return undefined

    const target = metersPerPixel * maxWidth
    if (!Number.isFinite(target) || target <= 0) return undefined
    // 沿用 1、2、3、5 的刻度序列，并扩展至小于一米的尺度。
    const magnitude = 10 ** Math.floor(Math.log10(target))
    const factor = [5, 3, 2, 1].find(value => value * magnitude <= target)
    if (!factor) return undefined
    const distance = Number((factor * magnitude).toPrecision(12))
    const label = distance >= 1000 ? `${Number((distance / 1000).toPrecision(12))} km` : `${distance} m`
    return { distance, width: distance / metersPerPixel, label, metersPerPixel }
}
