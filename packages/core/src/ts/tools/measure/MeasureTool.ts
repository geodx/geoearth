import {
    Cartesian3, Cartographic, CustomDataSource, defined,
    Math as CesiumMath, sampleTerrainMostDetailed, Viewer,
    Cartesian2,
    Color,
    HeightReference,
    VerticalOrigin
} from "cesium";
import { CoordinateType, DrawTool } from "../draw";
import { ElevationSource, ElevationTarget, MeasureCancelledError, PointElevationOptions, PointElevationResult } from "./types";
interface SampledElevation {
    cartographic: Cartographic
    source: ElevationSource
}

export class MeasureTool {
    private readonly dataSource = new CustomDataSource('geoearth-measure')
    private activeTaskId?: number
    private taskSequence = 0
    constructor(private readonly viewer: Viewer, private readonly draw: DrawTool) {
        void this.viewer.dataSources.add(this.dataSource)
    }

    get isActive(): boolean {
        return this.activeTaskId !== undefined
    }

    /**
     * 测量 点高程
     */
    async measureHeight(options: PointElevationOptions = {}): Promise<PointElevationResult> {
        this.stop()
        this.stop()
        const taskId = ++this.taskSequence
        this.activeTaskId = taskId
        try {
            const pickedPosition = await this.draw.drawPoint({
                coordinateType: CoordinateType.CARTESIAN3
            })

            this.ensureTaskActive(taskId)

            const sampled = await this.sampleElevation(pickedPosition, options.target ?? ElevationTarget.SURFACE)

            this.ensureTaskActive(taskId)

            const result = this.createResult(pickedPosition, sampled)

            if (options.showResult !== false) {
                this.showResult(result, options.fractionDigits ?? 2)
            }

            return result
        } finally {
            if (this.activeTaskId === taskId) {
                this.activeTaskId = undefined
            }
        }
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

        const renderedTerrainHeight = scene.globe.getHeight(samplePosition)

        if (defined(renderedTerrainHeight)) {
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
            id: this.createResultId(),
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
    * 高程请求本身无法中止，但请求返回后会通过 taskId 丢弃结果。
    */
    stop(): boolean {
        if (this.activeTaskId === undefined) {
            return false
        }

        this.activeTaskId = undefined
        this.draw.cancel('Point elevation measurement was cancelled.')

        return true
    }

    clear(): void {
        this.dataSource.entities.removeAll()
    }
    destroy(): void {
        this.stop()
        this.clear()

        if (this.viewer.dataSources.contains(this.dataSource)) {
            this.viewer.dataSources.remove(this.dataSource, true)
        }
    }


    private ensureTaskActive(taskId: number): void {
        if (this.activeTaskId !== taskId) {
            throw new MeasureCancelledError()
        }
    }


    private showResult(result: PointElevationResult, fractionDigits: number): void {
        const pointId = `${result.id}-point`
        const labelId = `${result.id}-label`

        this.dataSource.entities.add({
            id: pointId,
            position: result.position,
            point: {
                pixelSize: 9,
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                heightReference: HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        })

        this.dataSource.entities.add({
            id: labelId,
            position: result.position,
            label: {
                text: `${result.height.toFixed(fractionDigits)} m`,
                font: '14px sans-serif',
                fillColor: Color.WHITE,
                showBackground: true,
                backgroundColor: Color.BLACK.withAlpha(0.7),
                pixelOffset: new Cartesian2(0, -22),
                verticalOrigin: VerticalOrigin.BOTTOM,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        })
    }


    private createResultId(): string {
        if (typeof globalThis.crypto?.randomUUID === 'function') {
            return `point-elevation-${globalThis.crypto.randomUUID()}`
        }

        return `point-elevation-${Date.now()}-${Math.random().toString(16).slice(2)}`
    }




}