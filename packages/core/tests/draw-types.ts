import type { Cartesian3, Cartographic } from 'cesium'
import {
    DrawTool, CoordinateType, EntityFactory, type EntityAreaOptions, type EntityLineOptions, type DegreePosition, type DrawCircleResult,
    type DrawLineResult, type DrawRectangleResult, type DrawHeightResult,
    type DrawPointOptions, type DrawPolygonOptions, type WorldDegree,
} from '../dist/index'

declare const draw: DrawTool
const point: Promise<Cartesian3> = draw.drawPoint()
const degrees: Promise<DegreePosition> = draw.drawPoint({ coordinateType: CoordinateType.DEGREES,
    onMove(position) { const lon: number = position.longitude; void lon } })
const radians: Promise<Cartographic> = draw.drawPoint({ coordinateType: CoordinateType.CARTOGRAPHIC })
const defaults: DrawPointOptions = { onMove(position) { const x: number = position.x; void x } }
const options: DrawPointOptions<CoordinateType.DEGREES> = { coordinateType: CoordinateType.DEGREES }
const segment: Promise<DrawLineResult<CoordinateType.DEGREES>> = draw.drawLine({ coordinateType: CoordinateType.DEGREES })
const circle: Promise<DrawCircleResult<CoordinateType.DEGREES>> = draw.drawCircle({ coordinateType: CoordinateType.DEGREES,
    onMove(result) { const radius: number = result.radius; const lon: number = result.center.longitude; void radius; void lon } })
const polygon: Promise<Cartographic[]> = draw.drawPolygon({ coordinateType: CoordinateType.CARTOGRAPHIC })
const rectangle: Promise<DrawRectangleResult> = draw.drawRectangle()
const height: Promise<DrawHeightResult<CoordinateType.DEGREES>> = draw.drawHeightDifference({ coordinateType: CoordinateType.DEGREES })
declare const dynamic: CoordinateType
const union: Promise<Cartesian3 | Cartographic | DegreePosition> = draw.drawPoint({ coordinateType: dynamic })
declare const world: WorldDegree
const sameCoordinate: DegreePosition = world
// @ts-expect-error 非默认格式必须指定运行时 coordinateType。
const missing: DrawPointOptions<CoordinateType.DEGREES> = {}
// @ts-expect-error 不能仅用泛型宣称返回度，运行时却使用默认 Cartesian3。
draw.drawPoint<CoordinateType.DEGREES>()
// @ts-expect-error 显式泛型与运行时坐标格式必须一致。
draw.drawCircle<CoordinateType.DEGREES>({ coordinateType: CoordinateType.CARTESIAN3 })
// @ts-expect-error 非默认多边形选项也必须显式指定格式。
const badPolygon: DrawPolygonOptions<CoordinateType.CARTOGRAPHIC> = { color: undefined }
// @ts-expect-error 平面不能混用经纬度结果类型参数。
draw.drawYPlane<CoordinateType.DEGREES>({})
void [point, degrees, radians, defaults, options, segment, circle, polygon, rectangle, height, union, sameCoordinate, missing, badPolygon]

declare const cartesian: Cartesian3
const areaStyle: EntityAreaOptions = { clampToGround: false }
const lineStyle: EntityLineOptions = { clampToGround: true }
EntityFactory.createCircle(cartesian, 100, areaStyle)
EntityFactory.createPolygon([cartesian, cartesian, cartesian], areaStyle)
EntityFactory.createLightingLine([cartesian, cartesian], lineStyle)
// @ts-expect-error 工厂接收 Cartesian3，不能直接传经纬度对象。
EntityFactory.createCircle(world, 100)
// @ts-expect-error 多边形工厂要求 Cartesian3 坐标。
EntityFactory.createPolygon([world, world, world])
