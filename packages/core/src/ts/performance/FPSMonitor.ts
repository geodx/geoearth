import type { Viewer } from 'cesium'

export class FPSMonitor {
    private fps = 0
    private frameCount = 0
    private lastTime = performance.now()
    private removePostRenderListener?: () => void

    constructor(private readonly viewer: Viewer) { }

    showDebugFPS() {
        this.viewer.scene.debugShowFramesPerSecond = true
        this.start()
    }

    hideDebugFPS() {
        this.viewer.scene.debugShowFramesPerSecond = false
    }

    getFPS() {
        this.start()
        return this.fps
    }

    destroy() {
        this.hideDebugFPS()
        this.removePostRenderListener?.()
        this.removePostRenderListener = undefined
        this.frameCount = 0
        this.fps = 0
        this.lastTime = performance.now()
    }

    private start() {
        if (this.removePostRenderListener) {
            return
        }

        this.lastTime = performance.now()

        this.removePostRenderListener = this.viewer.scene.postRender.addEventListener(() => {
            this.frameCount++

            const now = performance.now()
            const elapsed = now - this.lastTime

            if (elapsed >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / elapsed)
                this.frameCount = 0
                this.lastTime = now
            }
        })
    }
}