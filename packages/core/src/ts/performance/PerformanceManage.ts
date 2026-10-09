import type { Viewer } from 'cesium'
import { FPSMonitor } from './FPSMonitor'

export class PerformanceManage {
    private readonly fpsMonitor: FPSMonitor

    constructor(viewer: Viewer) {
        this.fpsMonitor = new FPSMonitor(viewer)
    }

    showDebugFPS() {
        this.fpsMonitor.showDebugFPS()
    }

    hideDebugFPS() {
        this.fpsMonitor.hideDebugFPS()
    }

    getFPS() {
        return this.fpsMonitor.getFPS()
    }

    destroy() {
        this.fpsMonitor.destroy()
    }
}