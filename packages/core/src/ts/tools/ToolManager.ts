import type { ScreenEvent } from '../events/modules/ScreenEvent'
import type { SceneHost } from '../utils/scene/types'
import { DrawTool } from './draw/DrawTool'
import { MeasureTool } from './measure/MeasureTool'
import { FPSMonitor } from './fps/index'
import { TrajectoryPlayer, type TrajectoryOptions } from './trajectory'
// import { PlotTool } from './plot/PlotTool'

export class ToolManager {
    public readonly draw: DrawTool
    public readonly measure: MeasureTool
    public readonly fps: FPSMonitor
    // public readonly plot: PlotTool

    constructor(private readonly host: SceneHost, screenEvent: ScreenEvent) {
        const viewer = 'viewer' in host ? host.viewer : host
        this.draw = new DrawTool(viewer, screenEvent)
        this.measure = new MeasureTool(viewer, this.draw)
        this.fps = new FPSMonitor(viewer)
        // this.plot = new PlotTool(viewer, this.draw)
    }

    createTrajectoryPlayer(options?: TrajectoryOptions): TrajectoryPlayer {
        return new TrajectoryPlayer(this.host, options)
    }

    destroy(): void {
        this.fps.destroy()
        // measure、plot 必须先停止，再销毁它们共同依赖的 draw。
        this.measure.destroy()
        // this.plot.destroy()
        this.draw.destroy()
    }
}
