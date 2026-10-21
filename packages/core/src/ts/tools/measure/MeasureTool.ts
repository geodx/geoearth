import {
    ArcType, Cartesian3, Cartographic, Color, ColorMaterialProperty, createGuid,
    CustomDataSource, EllipsoidTerrainProvider, Entity, Math as CesiumMath,
    sampleTerrainMostDetailed, type Viewer,
} from 'cesium'
import { CoordinateType, DrawCancelledError, type DrawTool } from '../draw'
import { EntityFactory } from '../../visualization/entities'
import { getSpaceAngle, getSpaceDistance, getSurfaceArea, getSurfaceDistance } from '../../utils/geometry'
import { sampleGroundPath } from './sampleGroundPath'
import {
    ElevationSource, ElevationTarget, MeasureCancelledError,
    type AngleResult, type AreaResult, type GroundDistanceOptions, type GroundDistanceResult,
    type HeightDifferenceResult, type MeasureOptions, type MeasureResult, type PerimeterResult,
    type PointElevationOptions, type PointElevationResult, type SpaceDistanceResult, type TriangleDistanceResult,
} from './types'

interface SampledElevation {
    cartographic: Cartographic
    source: ElevationSource
}

export class MeasureTool {
    private readonly dataSource = new CustomDataSource('geoearth-measure')
    private task?: { cancel: () => void; drawing: boolean }
    private destroyed = false
    private readonly results = new Map<string, { result: MeasureResult; entities: Entity[] }>()

    constructor(private readonly viewer: Viewer, private readonly draw: DrawTool) {
        const collection = viewer.dataSources
        void collection.add(this.dataSource).then(() => {
            if (this.destroyed && !collection.isDestroyed() && collection.contains(this.dataSource)) {
                collection.remove(this.dataSource, true)
            }
        })
    }

    get isActive(): boolean {
        return this.task !== undefined
    }

    /**
     * 测量 点高程
     */
    measureHeight(options: PointElevationOptions = {}): Promise<PointElevationResult> {
        return this.run(options, async finishPicking => {
            const pickedPosition = await this.draw.drawPoint({
                coordinateType: CoordinateType.CARTESIAN3
            })
            finishPicking()
            const sampled = await this.sampleElevation(pickedPosition, options.target ?? ElevationTarget.SURFACE)
            return this.createResult(pickedPosition, sampled)
        })
    }

    /** 相邻节点之间的三维直线段距离之和。 */
    spaceDistance(options: MeasureOptions = {}): Promise<SpaceDistanceResult> {
        return this.run(options, async () => {
            const positions = await this.draw.drawPolyLine({ clampToGround: false })
            const segmentLengths = positions.slice(1).map((point, i) => Cartesian3.distance(positions[i], point))
            return { id: createGuid(), type: 'space-distance', positions, segmentLengths, distance: getSpaceDistance(positions) }
        })
    }

    /** 沿控制点间的测地线采样地形，计算加密折线长度。 */
    groundDistance(options: GroundDistanceOptions = {}): Promise<GroundDistanceResult> {
        return this.run(options, async finishPicking => {
            if (!Number.isFinite(options.sampleSpacing ?? 30) || (options.sampleSpacing ?? 30) <= 0) {
                throw new Error('sampleSpacing 必须是大于零的米数。')
            }
            if (!Number.isInteger(options.maxSamples ?? 4096) || (options.maxSamples ?? 4096) < 2) {
                throw new Error('maxSamples 必须是至少为 2 的整数。')
            }
            const positions = await this.draw.drawPolyLine({ clampToGround: true })
            finishPicking()
            const sampled = await sampleGroundPath(this.viewer, positions, options)
            return { id: createGuid(), type: 'ground-distance', positions, ...sampled, distance: getSpaceDistance(sampled.sampledPositions) }
        })
    }

    /** 球面面积，忽略高度；不代表地形起伏表面积。 */
    surfaceArea(options: MeasureOptions = {}): Promise<AreaResult> {
        return this.run(options, async () => {
            const positions = await this.draw.drawPolygon()
            const ellipsoid = this.viewer.scene.globe.ellipsoid
            return {
                id: createGuid(), type: 'area', positions,
                area: getSurfaceArea(positions, ellipsoid),
                perimeter: getSurfaceDistance([...positions, positions[0]], ellipsoid),
            }
        })
    }

    /** 多边形闭合边界的椭球测地线周长。 */
    perimeter(options: MeasureOptions = {}): Promise<PerimeterResult> {
        return this.run(options, async () => {
            const positions = await this.draw.drawPolygon()
            return {
                id: createGuid(), type: 'perimeter', positions,
                perimeter: getSurfaceDistance([...positions, positions[0]], this.viewer.scene.globe.ellipsoid),
            }
        })
    }

    /** 两个拾取位置的椭球高差，保留正负号。 */
    verticalDistance(options: MeasureOptions = {}): Promise<HeightDifferenceResult> {
        return this.run(options, async () => {
            const height = await this.draw.drawHeightDifference()
            return { id: createGuid(), type: 'height-difference', ...height, distance: Math.abs(height.heightDifference) }
        })
    }

    /** 三次点击，第二点为角顶点，返回三维向量夹角（度）。 */
    measureAngle(options: MeasureOptions = {}): Promise<AngleResult> {
        return this.run(options, async () => {
            const positions = await this.draw.drawAngle()
            return { id: createGuid(), type: 'angle', positions, angle: getSpaceAngle(positions) }
        })
    }

    /** 在起点的局部切平面/椭球法线方向，将空间线段分解为直角三角形。 */
    triangleDistance(options: MeasureOptions = {}): Promise<TriangleDistanceResult> {
        return this.run(options, async () => {
            const positions = await this.draw.drawLine()
            const [start, end] = positions
            const delta = Cartesian3.subtract(end, start, new Cartesian3())
            const up = this.viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(start)
            const verticalDistance = Cartesian3.dot(delta, up)
            const vertical = Cartesian3.multiplyByScalar(up, verticalDistance, new Cartesian3())
            const corner = Cartesian3.subtract(end, vertical, new Cartesian3())
            return {
                id: createGuid(), type: 'triangle-distance', positions, corner, verticalDistance,
                distance: Cartesian3.distance(start, end), horizontalDistance: Cartesian3.distance(start, corner),
            }
        })
    }

    private async sampleElevation(pickedPosition: Cartesian3, target: ElevationTarget): Promise<SampledElevation> {
        const scene = this.viewer.scene
        const ellipsoid = scene.globe.ellipsoid
        const pickedCartographic = ellipsoid.cartesianToCartographic(pickedPosition)

        if (!pickedCartographic) {
            throw new Error('Unable to convert the picked position to Cartographic.')
        }

        const samplePosition = new Cartographic(pickedCartographic.longitude, pickedCartographic.latitude, 0)

        if (target === ElevationTarget.SURFACE && scene.sampleHeightSupported) {
            try {
                const [sampledPosition] = await scene.sampleHeightMostDetailed([Cartographic.clone(samplePosition)])

                if (sampledPosition && Number.isFinite(sampledPosition.height)) {
                    return {
                        cartographic: sampledPosition,
                        source: ElevationSource.SCENE
                    }
                }
            } catch {
                // 场景表面采样失败后继续尝试地形采样。
            }
        }

        if (this.viewer.terrainProvider.availability) {
            try {
                const [terrainPosition] = await sampleTerrainMostDetailed(this.viewer.terrainProvider, [Cartographic.clone(samplePosition)])

                if (terrainPosition && Number.isFinite(terrainPosition.height)) {
                    return {
                        cartographic: terrainPosition,
                        source: ElevationSource.TERRAIN
                    }
                }
            } catch {
                // 地形最高精度采样失败后使用当前已加载地形。
            }
        }

        const renderedTerrainHeight = this.viewer.terrainProvider instanceof EllipsoidTerrainProvider
            ? undefined : scene.globe.getHeight(samplePosition)

        if (Number.isFinite(renderedTerrainHeight)) {
            samplePosition.height = renderedTerrainHeight

            return {
                cartographic: samplePosition,
                source: ElevationSource.TERRAIN
            }
        }

        if (target === ElevationTarget.SURFACE && Number.isFinite(pickedCartographic.height)) {
            return {
                cartographic: Cartographic.clone(pickedCartographic),
                source: ElevationSource.PICKED
            }
        }

        samplePosition.height = 0

        return {
            cartographic: samplePosition,
            source: ElevationSource.ELLIPSOID
        }
    }
    private createResult(pickedPosition: Cartesian3, sampled: SampledElevation): PointElevationResult {
        const { cartographic, source } = sampled
        const ellipsoid = this.viewer.scene.globe.ellipsoid

        return {
            id: createGuid(),
            type: 'point-height',
            pickedPosition: Cartesian3.clone(pickedPosition),
            position: Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height, ellipsoid),
            longitude: CesiumMath.toDegrees(cartographic.longitude),
            latitude: CesiumMath.toDegrees(cartographic.latitude),
            height: cartographic.height,
            source
        }
    }
    /**
    * 停止当前测量。
    *
    * 立即拒绝当前 Promise；已发出的地形请求返回后丢弃结果。
    */
    stop(): boolean {
        const task = this.task
        if (!task) return false
        this.task = undefined
        if (task.drawing) this.draw.cancel('Measurement was cancelled.')
        task.cancel()
        return true
    }

    /** 提交已固定的折线/多边形节点；节点不足或正在采样时返回 false。 */
    finish(): boolean {
        return !!this.task?.drawing && this.draw.finish()
    }

    getResults(): MeasureResult[] {
        return [...this.results.values()].map(item => item.result)
    }

    remove(id: string): boolean {
        const item = this.results.get(id)
        if (!item) return false
        for (const entity of item.entities) this.dataSource.entities.remove(entity)
        this.results.delete(id)
        this.viewer.scene.requestRender()
        return true
    }

    clear(): void {
        this.stop()
        this.dataSource.entities.removeAll()
        this.results.clear()
        this.viewer.scene.requestRender()
    }

    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.clear()
        if (this.viewer.dataSources.contains(this.dataSource)) {
            this.viewer.dataSources.remove(this.dataSource, true)
        }
    }

    /** 共用任务取消和结果管理；各测量方法只负责采点与计算。 */
    private async run<T extends MeasureResult>(options: MeasureOptions, operation: (finishPicking: () => void) => Promise<T>): Promise<T> {
        if (this.destroyed) throw new Error('MeasureTool 已销毁。')
        const digits = options.fractionDigits ?? 2
        if (!Number.isInteger(digits) || digits < 0 || digits > 100) throw new Error('fractionDigits 必须是 0～100 的整数。')
        this.stop()
        let cancel: () => void
        const cancelled = new Promise<never>((_, reject) => { cancel = () => reject(new MeasureCancelledError()) })
        const task = { cancel: cancel!, drawing: true }
        const ensureActive = () => {
            if (this.task !== task) throw new MeasureCancelledError()
        }
        this.task = task
        try {
            const finishPicking = () => {
                ensureActive()
                task.drawing = false
            }
            const result = await Promise.race([operation(finishPicking), cancelled])
            ensureActive()
            const entities = options.showResult === false ? [] : this.showResult(result, digits)
            this.results.set(result.id, { result, entities })
            this.viewer.scene.requestRender()
            return result
        } catch (error) {
            if (error instanceof DrawCancelledError) throw new MeasureCancelledError(error.message)
            throw error
        } finally {
            if (this.task === task) this.task = undefined
        }
    }

    private showResult(result: MeasureResult, digits: number): Entity[] {
        const entities: Entity[] = []
        const add = (entity: Entity) => entities.push(this.dataSource.entities.add(entity))
        const label = (position: Cartesian3, text: string) => add(EntityFactory.buildLabel(position, text))
        const line = (positions: Cartesian3[], clampToGround = false) => {
            const entity = EntityFactory.createLightingLine(positions, {
                clampToGround, arcType: clampToGround ? ArcType.GEODESIC : ArcType.NONE,
            })
            // 空间线段可能穿过地表，遮挡部分也显示，保持实际测量线段的位置。
            if (!clampToGround) entity.polyline!.depthFailMaterial = new ColorMaterialProperty(Color.CYAN)
            add(entity)
        }
        const meters = (value: number) => `${value.toFixed(digits)} m`
        const points = result.type === 'point-height' ? [result.position]
            : result.type === 'height-difference' ? [result.start, result.end, result.pickedEnd] : result.positions
        for (const point of points) add(EntityFactory.createRedPoint(point))

        switch (result.type) {
            case 'point-height':
                label(result.position, meters(result.height))
                break
            case 'space-distance':
                line(result.positions)
                label(result.positions[result.positions.length - 1], meters(result.distance))
                break
            case 'ground-distance':
                line(result.sampledPositions)
                label(result.sampledPositions[result.sampledPositions.length - 1], meters(result.distance))
                break
            case 'area':
            case 'perimeter':
                if (result.type === 'area') add(EntityFactory.createPolygon(result.positions))
                else line([...result.positions, result.positions[0]], true)
                label(result.positions[0], result.type === 'area' ? `${result.area.toFixed(digits)} m²` : meters(result.perimeter))
                break
            case 'height-difference':
                line([result.start, result.end])
                label(result.end, meters(result.heightDifference))
                break
            case 'angle':
                line(result.positions)
                label(result.positions[1], `${result.angle.toFixed(digits)}°`)
                break
            case 'triangle-distance':
                line([result.positions[0], result.corner, result.positions[1], result.positions[0]])
                label(result.corner, `水平 ${meters(result.horizontalDistance)}\n竖直 ${meters(result.verticalDistance)}\n空间 ${meters(result.distance)}`)
                break
        }
        return entities
    }
}
