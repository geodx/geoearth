import { Cartesian3 } from 'cesium'
import type { WorldDegree } from '../../viewer/types'
import { toCartesian } from './positions'

/** 保留旧方法名；所有经纬度输入均以度计，高度以米计。 */
export const Cartesian3Tool = {
    formCartographicObj(position: WorldDegree): Cartesian3 { return toCartesian(position) },
    formCartographicObjS(positions: readonly WorldDegree[]): Cartesian3[] { return positions.map(position => toCartesian(position)) },
    formCartographicArr(position: readonly number[]): Cartesian3 {
        return toCartesian({ longitude: position[0], latitude: position[1], height: position[2] ?? 0 })
    },
    formCartographicArrS(positions: readonly (readonly number[])[]): Cartesian3[] {
        return positions.map(position => Cartesian3Tool.formCartographicArr(position))
    },
}
