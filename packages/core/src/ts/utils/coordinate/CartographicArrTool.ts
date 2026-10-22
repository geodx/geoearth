import type { Cartesian3 } from 'cesium'
import { CartographicTool } from './CartographicTool'

/** 度制经纬度数组与对象转换共用实现，避免维护两套弧度转换。 */
export const CartographicArrTool = {
    formCartesian3(position: Cartesian3): [number, number, number] {
        const { longitude, latitude, height } = CartographicTool.formCartesian3(position)
        return [longitude, latitude, height]
    },
    formCartesian3S(positions: readonly Cartesian3[]): [number, number, number][] {
        return positions.map(position => CartographicArrTool.formCartesian3(position))
    },
}
