import type { Viewer } from 'cesium'
import type { ScreenEvent } from '../events/modules/ScreenEvent'
import { DrawTool } from './draw/DrawTool'
import { MeasureTool } from './measure/MeasureTool'
import { FPSMonitor } from './fps/index'
// import { PlotTool } from './plot/PlotTool'

export class ToolManager {
    public readonly draw: DrawTool
    public readonly measure: MeasureTool
    public readonly fps: FPSMonitor
    // public readonly plot: PlotTool

    constructor(viewer: Viewer, screenEvent: ScreenEvent) {
        this.draw = new DrawTool(viewer, screenEvent)
        this.measure = new MeasureTool(viewer, this.draw)
        this.fps = new FPSMonitor(viewer)
        // this.plot = new PlotTool(viewer, this.draw)
    }

    destroy(): void {
        this.fps.destroy()
        // measure、plot 必须先停止，再销毁它们共同依赖的 draw。
        this.measure.destroy()
        // this.plot.destroy()
        this.draw.destroy()
    }
}
