import { Cartesian2, Cartesian3, type Viewer } from 'cesium'
import mapv from '../../lib/mapv.js'
import { projectPosition } from '../../../../../../utils/coordinate/projectPosition'
import type { MapVDataSet, MapVOptions } from '../types'

/** 仅负责画布坐标投影和绘制；帧调度与事件监听由 MapVLayer 管理。 */
export class MapVRenderer extends mapv.BaseLayer {

    constructor(private readonly viewer: Viewer, readonly canvas: HTMLCanvasElement, data: MapVDataSet, options: MapVOptions) {
        super(viewer, data, options)
        this.options = { context: '2d', draw: 'simple', ...options }
        this.context = this.options.context
        this.canvasLayer = { canvas, devicePixelRatio: viewer.container.ownerDocument.defaultView?.devicePixelRatio ?? 1 }
        this.initDataRange(this.options)
        this.argCheck(this.options)
    }

    render(step?: number): void {
        const context = this.canvas.getContext(this.options.context) as CanvasRenderingContext2D | WebGLRenderingContext | null
        if (!context) throw new Error(`MapV ${this.options.context} context is unavailable.`)
        if (this.options.context === '2d') {
            const ctx = context as CanvasRenderingContext2D
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            const dpr = this.canvasLayer.devicePixelRatio
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            for (const key of ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'shadowColor', 'shadowBlur', 'font', 'textAlign', 'textBaseline']) if (this.options[key] !== undefined) (ctx as any)[key] = this.options[key]
        } else (context as WebGLRenderingContext).clear((context as WebGLRenderingContext).COLOR_BUFFER_BIT)
        const data = this.dataSet.get({
            transferCoordinate: (coordinate: number[]) => {
                if (!coordinate || !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1]) || Math.abs(coordinate[1]) > 90) return [NaN, NaN]
                const point = projectPosition(this.viewer, Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2] ?? 0))
                return point ? [point.x, point.y] : [NaN, NaN]
            },
            ...(step === undefined ? {} : {
                filter: (item: {
                    time?: number
                }) => Number.isFinite(item.time) && item.time! >= step - (this.options.animation?.trails ?? 10) && item.time! <= step
            }),
        })
        this.processData(data)
        const origin = projectPosition(this.viewer, Cartesian3.fromDegrees(0, 0)) ?? Cartesian2.ZERO
        this.drawContext(context, new mapv.DataSet(data), this.options, origin)
        this.options.updateCallback?.(step)
    }

    setOptions(options: MapVOptions): void {
        if (options.context && options.context !== this.context) throw new Error('Create another MapVLayer to change canvas context.')
        this.options = { ...this.options, ...options }
        this.initDataRange(this.options)
    }

    hitTest(position: Cartesian2): any {
        return this.isPointInPath(this.canvas.getContext(this.context), position)
    }
}
