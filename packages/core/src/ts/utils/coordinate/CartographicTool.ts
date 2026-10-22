import { Ellipsoid, Math as CesiumMath, type Cartesian3 } from 'cesium'
import type { WorldDegree } from '../../viewer/types'

/** 返回角度制普通对象，不把度数写入弧度制的 Cartographic。 */
function formCartesian3(position: Cartesian3, ellipsoid = Ellipsoid.WGS84): WorldDegree {
    const point = ellipsoid.cartesianToCartographic(position)
    return { longitude: CesiumMath.toDegrees(point.longitude), latitude: CesiumMath.toDegrees(point.latitude), height: point.height }
}
export const CartographicTool = {
    formCartesian3,
    formCartesian3S: (positions: readonly Cartesian3[]) => positions.map(position => formCartesian3(position)),
}
