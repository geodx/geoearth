import type { Viewer } from 'cesium'

export class FPSMonitor {
    private fps = 0
    private frameCount = 0
    private lastTime = performance.now()
    private removePostRenderListener?: () => void
    private destroyed = false

    constructor(private readonly viewer: Viewer) { }

    showDebugFPS() {
        this.assertAlive()
        this.viewer.scene.debugShowFramesPerSecond = true
        this.start()
    }

    hideDebugFPS() {
        if (!this.viewer.isDestroyed()) this.viewer.scene.debugShowFramesPerSecond = false
    }

    getFPS() {
        this.assertAlive()
        this.start()
        this.update(performance.now())
        return this.fps
    }

    destroy() {
        if (this.destroyed) return
        this.destroyed = true
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
            this.update(performance.now())
        })
    }

    private update(now: number): void {
        const elapsed = now - this.lastTime
        if (elapsed < 1000) return
        this.fps = Math.round((this.frameCount * 1000) / elapsed)
        this.frameCount = 0
        this.lastTime = now
    }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('FPSMonitor has been destroyed')
    }
}
