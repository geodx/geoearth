import type { Viewer } from 'cesium'

/** 按实际渲染帧统计 FPS；首次显示面板或读取数值时才开始监听。 */
export class FPSMonitor {
    private fps = 0
    private frameCount = 0
    private lastTime = performance.now()
    private removePostRenderListener?: () => void
    private destroyed = false

    constructor(private readonly viewer: Viewer) { }

    show(): void {
        this.assertAlive()
        this.viewer.scene.debugShowFramesPerSecond = true
        this.start()
    }

    /** 只隐藏 Cesium 的帧率面板，保留统计，便于其他界面继续读取。 */
    hide(): void {
        if (!this.viewer.isDestroyed()) this.viewer.scene.debugShowFramesPerSecond = false
    }

    /** 返回最近统计窗口的帧率；首次调用尚未累计满一秒时返回 0。 */
    getFPS(): number {
        this.assertAlive()
        this.start()
        this.update(performance.now())
        return this.fps
    }

    private start(): void {
        if (this.removePostRenderListener) return
        this.lastTime = performance.now()
        this.removePostRenderListener = this.viewer.scene.postRender.addEventListener(() => {
            this.frameCount++
            this.update(performance.now())
        })
    }

    private update(now: number): void {
        const elapsed = now - this.lastTime
        if (elapsed < 1000) return
        this.fps = Math.round(this.frameCount * 1000 / elapsed)
        this.frameCount = 0
        this.lastTime = now
    }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('FPS 监测工具已销毁。')
    }

    /** ToolManager 在 Viewer 销毁前调用，解除帧监听并隐藏面板。 */
    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.hide()
        this.removePostRenderListener?.()
        this.removePostRenderListener = undefined
        this.frameCount = 0
        this.fps = 0
        this.lastTime = performance.now()
    }
}
