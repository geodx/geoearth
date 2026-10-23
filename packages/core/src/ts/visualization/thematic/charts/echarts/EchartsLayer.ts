import * as echarts from 'echarts'
import { Cartesian2, Cartesian3, Cartographic, Matrix4, Math as CesiumMath, createGuid, type Viewer } from 'cesium'
import { OwnedResource } from '../../../../utils/scene/OwnedResource'
import { projectPosition } from '../../../../utils/coordinate/projectPosition'
import type { VisualizationHost } from '../../../types'

export type EchartsLayerOption = echarts.EChartsOption

export interface EchartsLayerSettings {
    interactive?: boolean
    renderer?: 'canvas' | 'svg'
}
const viewers = new Map<string, Viewer>()

/** 坐标系只注册一次；每个系列绑定自己的 Viewer，支持多地球同时使用。 */
class GeoEarthCoordinateSystem {
    readonly type = 'geoearth'
    readonly dimensions = ['lng', 'lat']

    constructor(private readonly viewer: Viewer) { }

    dataToPoint(data: number[]): number[] {
        if (!data || !Number.isFinite(data[0]) || !Number.isFinite(data[1]) || Math.abs(data[1]) > 90) return [NaN, NaN]
        // ECharts 第三个值通常是业务指标，不作为椭球高度。
        const point = projectPosition(this.viewer, Cartesian3.fromDegrees(data[0], data[1]))
        return point ? [point.x, point.y] : [NaN, NaN]
    }

    pointToData(point: number[]): number[] {
        const ray = this.viewer.camera.getPickRay(new Cartesian2(point[0], point[1]))
        const world = ray && this.viewer.scene.globe.pick(ray, this.viewer.scene)
        if (!world) return [NaN, NaN]
        const value = Cartographic.fromCartesian(world)
        return [CesiumMath.toDegrees(value.longitude), CesiumMath.toDegrees(value.latitude)]
    }

    getViewRect() {
        return new echarts.graphic.BoundingRect(0, 0, this.viewer.canvas.clientWidth, this.viewer.canvas.clientHeight)
    }

    getRoamTransform() {
        return echarts.matrix.create()
    }

    convertToPixel(_model: unknown, finder: any, value: number[]) {
        return finder.seriesModel?.coordinateSystem === this ? this.dataToPoint(value) : null
    }

    convertFromPixel(_model: unknown, finder: any, value: number[]) {
        return finder.seriesModel?.coordinateSystem === this ? this.pointToData(value) : null
    }
    static dimensions = ['lng', 'lat']

    static create(ecModel: any): GeoEarthCoordinateSystem[] {
        const systems: GeoEarthCoordinateSystem[] = []
        ecModel.eachSeries((series: any) => {
            if (series.get('coordinateSystem') !== 'geoearth') return
            const viewer = viewers.get(series.get('geoearthViewerId'))
            if (viewer && !viewer.isDestroyed()) {
                const system = new GeoEarthCoordinateSystem(viewer)
                series.coordinateSystem = system
                systems.push(system)
            }
        })
        return systems
    }
}
echarts.registerCoordinateSystem('geoearth', GeoEarthCoordinateSystem as any)

/** 在地球上绘制 ECharts 图表；坐标系使用 'geoearth'，传入 'cesium' 时自动转换。 */
export class EchartsLayer extends OwnedResource {
    readonly element: HTMLDivElement
    readonly chart: echarts.ECharts
    private readonly id = createGuid()
    private readonly matrix = new Matrix4()
    private readonly projection = new Matrix4()
    private width = -1
    private height = -1
    private visible = true

    constructor(host: VisualizationHost, options: EchartsLayerOption, settings: EchartsLayerSettings = {}) {
        super(host)
        this.element = this.viewer.container.ownerDocument.createElement('div')
        Object.assign(this.element.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: settings.interactive ? 'auto' : 'none',
            zIndex: '1'
        })
        this.element.className = 'geoearth-echarts-layer'
        this.viewer.container.append(this.element)
        viewers.set(this.id, this.viewer)
        try {
            this.chart = echarts.init(this.element, undefined, {
                renderer: settings.renderer ?? 'canvas',
                width: Math.max(1, this.viewer.canvas.clientWidth),
                height: Math.max(1, this.viewer.canvas.clientHeight)
            })
            this.setOption(options)
        } catch (error) {
            this.chart?.dispose()
            viewers.delete(this.id)
            this.element.remove()
            super.destroy()
            throw error
        }
        this.own(this.viewer.scene.postRender.addEventListener(() => this.refresh()))
    }

    get show(): boolean {
        return this.visible
    }

    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        this.element.hidden = !value
        if (value) this.resize()
        this.requestRender()
    }

    setOption(options: EchartsLayerOption, settings: {
        notMerge?: boolean
        lazyUpdate?: boolean
    } = {}): void {
        this.assertAlive()
        // 复制系列配置并标记所属地球，避免修改调用方配置或跨实例串用坐标系。
        const series = options.series == null ? undefined : (Array.isArray(options.series) ? options.series : [options.series]).map(item => {
            const value = item as any
            return value.coordinateSystem === 'cesium' || value.coordinateSystem === 'geoearth'
                ? { ...value, coordinateSystem: 'geoearth', geoearthViewerId: this.id } : { ...value }
        })
        this.chart.setOption({ ...options, ...(series ? { series } : {}) }, settings)
        this.requestRender()
    }

    resize(): void {
        this.assertAlive()
        this.width = this.viewer.canvas.clientWidth
        this.height = this.viewer.canvas.clientHeight
        this.chart.resize({ width: Math.max(1, this.width), height: Math.max(1, this.height), silent: true })
    }

    private refresh(): void {
        if (this.destroyed || !this.visible) return
        // 相机或视口变化时让 ECharts 重新投影；静止场景不重复提交配置。
        if (this.width !== this.viewer.canvas.clientWidth || this.height !== this.viewer.canvas.clientHeight) this.resize()
        else if (!Matrix4.equals(this.matrix, this.viewer.camera.viewMatrix) || !Matrix4.equals(this.projection, this.viewer.camera.frustum.projectionMatrix)) this.chart.setOption({}, { silent: true })
        Matrix4.clone(this.viewer.camera.viewMatrix, this.matrix)
        Matrix4.clone(this.viewer.camera.frustum.projectionMatrix, this.projection)
    }

    override destroy(): void {
        if (this.destroyed) return
        super.destroy()
        viewers.delete(this.id)
        this.chart.dispose()
        this.element.remove()
    }
}
