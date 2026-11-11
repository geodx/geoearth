import type { Viewer } from 'cesium'

export interface FPSStats {
    fps: number
    /** preRender 到 postRender 的平均 CPU 侧耗时，单位毫秒；空闲或尚未采样时为 undefined。 */
    renderTime?: number
    /** 最近完成的统计窗口内实际渲染的帧数。 */
    frames: number
    /** 最近完成的统计窗口长度，单位毫秒。 */
    sampleDuration: number
    state: 'sampling' | 'rendering' | 'idle' | 'hidden'
}

/** 被动统计实际渲染帧；显示面板或首次读取时才开始监听。 */
export class FPSMonitor {
    private stats: FPSStats = { fps: 0, frames: 0, sampleDuration: 0, state: 'sampling' }
    private frameCount = 0
    private measuredFrames = 0
    private totalRenderTime = 0
    private frameStarted?: number
    private lastTime = performance.now()
    private removePostRenderListener?: () => void
    private removePreRenderListener?: () => void
    private destroyed = false
    private readonly document: Document
    private readonly handleVisibilityChange = () => this.resetSample(performance.now())

    constructor(private readonly viewer: Viewer) {
        if (viewer.isDestroyed()) throw new Error('FPS 监测工具已销毁。')
        this.document = viewer.container.ownerDocument
    }

    get visible(): boolean {
        this.assertAlive()
        return this.viewer.scene.debugShowFramesPerSecond
    }

    show(): void {
        this.assertAlive()
        this.viewer.scene.debugShowFramesPerSecond = true
        this.start()
        this.viewer.scene.requestRender()
    }

    /** 只隐藏 Cesium 原生面板，统计仍可供其他界面读取。 */
    hide(): void {
        if (!this.viewer.isDestroyed()) {
            this.viewer.scene.debugShowFramesPerSecond = false
            this.viewer.scene.requestRender()
        }
    }

    /** 首次调用尚未累计满一秒时返回 0；按需渲染空闲时也可为 0。 */
    getFPS(): number {
        return this.getStats().fps
    }

    /** 返回最近统计窗口的副本；读取统计不会请求新的场景帧。 */
    getStats(): FPSStats {
        this.assertAlive()
        this.start()
        if (!this.document.hidden) this.update(performance.now())
        return { ...this.stats, state: this.document.hidden ? 'hidden' : this.stats.state }
    }

    /** 重置 SDK 的统计窗口，继续使用当前监听和面板状态。 */
    reset(): void {
        this.assertAlive()
        this.resetSample(performance.now())
    }

    isDestroyed(): boolean {
        return this.destroyed
    }

    private start(): void {
        if (this.removePostRenderListener) return
        this.resetSample(performance.now())
        this.removePreRenderListener = this.viewer.scene.preRender.addEventListener(() => {
            if (!this.document.hidden) this.frameStarted = performance.now()
        })
        this.removePostRenderListener = this.viewer.scene.postRender.addEventListener(() => {
            if (this.document.hidden) return
            const now = performance.now()
            this.frameCount++
            if (this.frameStarted !== undefined) {
                this.totalRenderTime += Math.max(0, now - this.frameStarted)
                this.measuredFrames++
            }
            this.frameStarted = undefined
            this.update(now)
        })
        this.document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    private update(now: number): void {
        const elapsed = now - this.lastTime
        if (elapsed < 1000) return
        this.stats = {
            fps: Math.round(this.frameCount * 1000 / elapsed),
            renderTime: this.measuredFrames ? this.totalRenderTime / this.measuredFrames : undefined,
            frames: this.frameCount,
            sampleDuration: elapsed,
            state: this.frameCount ? 'rendering' : 'idle',
        }
        this.frameCount = 0
        this.measuredFrames = 0
        this.totalRenderTime = 0
        this.lastTime = now
    }

    private resetSample(now: number): void {
        this.stats = { fps: 0, frames: 0, sampleDuration: 0, state: 'sampling' }
        this.frameCount = 0
        this.measuredFrames = 0
        this.totalRenderTime = 0
        this.frameStarted = undefined
        this.lastTime = now
    }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('FPS 监测工具已销毁。')
    }

    /** ToolManager 在 Viewer 销毁前调用，解除监听并隐藏面板。 */
    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.hide()
        this.removePreRenderListener?.()
        this.removePostRenderListener?.()
        this.removePreRenderListener = this.removePostRenderListener = undefined
        this.document.removeEventListener('visibilitychange', this.handleVisibilityChange)
        this.resetSample(performance.now())
    }
}
