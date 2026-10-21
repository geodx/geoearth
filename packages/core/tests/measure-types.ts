import {
    MeasureTool, ElevationTarget, EntityFactory,
    type PointElevationResult, type SpaceDistanceResult, type GroundDistanceResult,
    type AreaResult, type PerimeterResult, type HeightDifferenceResult,
    type AngleResult, type TriangleDistanceResult, type MeasureResult,
} from '../dist/index'
import { Cartesian3, ArcType } from 'cesium'

declare const measure: MeasureTool
const height: Promise<PointElevationResult> = measure.measureHeight({ target: ElevationTarget.TERRAIN })
const space: Promise<SpaceDistanceResult> = measure.spaceDistance({ showResult: false })
const ground: Promise<GroundDistanceResult> = measure.groundDistance({ sampleSpacing: 10, maxSamples: 100 })
const area: Promise<AreaResult> = measure.surfaceArea()
const perimeter: Promise<PerimeterResult> = measure.perimeter()
const difference: Promise<HeightDifferenceResult> = measure.verticalDistance()
const angle: Promise<AngleResult> = measure.measureAngle()
const triangle: Promise<TriangleDistanceResult> = measure.triangleDistance()
for (const result of measure.getResults()) {
    const typed: MeasureResult = result
    if (typed.type === 'area') { const squareMeters: number = typed.area; void squareMeters }
    if (typed.type === 'angle') { const degrees: number = typed.angle; void degrees }
}
const entity = EntityFactory.createLightingLine([Cartesian3.fromDegrees(0, 0)], { clampToGround: false, arcType: ArcType.NONE })
// @ts-expect-error 地形目标必须使用枚举。
measure.measureHeight({ target: 'wrong' })
// @ts-expect-error 空间距离不接受采样间距。
measure.spaceDistance({ sampleSpacing: 10 })
// @ts-expect-error 工厂方法要求 Cartesian3 坐标。
EntityFactory.createLightingLine([{ longitude: 0, latitude: 0, height: 0 }])
void [height, space, ground, area, perimeter, difference, angle, triangle, entity]
