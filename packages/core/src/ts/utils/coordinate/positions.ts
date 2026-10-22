import { Cartesian3, Ellipsoid } from 'cesium'
import type { WorldDegree } from '../../viewer/types'

/** 空间直角坐标，或以度和米表示的经纬度坐标。 */
export type WorldPosition = Cartesian3 | WorldDegree

/** 校验并复制输入坐标，避免后续修改调用方的数据。 */
export function toCartesian(position: WorldPosition, ellipsoid = Ellipsoid.WGS84): Cartesian3 {
    if (position instanceof Cartesian3) {
        if (![position.x, position.y, position.z].every(Number.isFinite)) {
            throw new RangeError('空间坐标各分量必须为有限数值。')
        }
        return Cartesian3.clone(position)
    }
    if (!position || ![position.longitude, position.latitude, position.height ?? 0].every(Number.isFinite) || Math.abs(position.latitude) > 90) {
        throw new RangeError('经纬度和高度必须为有限数值，纬度范围为 [-90, 90]。')
    }
    return Cartesian3.fromDegrees(position.longitude, position.latitude, position.height ?? 0, ellipsoid)
}
