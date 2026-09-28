import type { Viewer } from 'cesium'

import { Event } from '../events/Event'
import { ResourceManager } from '../sources'
import { ToolManager } from '../tools/ToolManager'

/**
 * 单个 Viewer 的基础运行上下文。
 *
 * 每个 Viewer 分别持有自己的事件、资源和工具实例，
 * 不同 Viewer 可以复用相同的管理器实现，但不会共享具体资源实例。
 */
export class ViewContext<TConfig = unknown> {
    public readonly event: Event<TConfig>
    public readonly sources: ResourceManager
    public readonly tools: ToolManager

    private destroyed = false

    constructor(public readonly viewer: Viewer) {
        if (viewer.isDestroyed()) {
            throw new Error('Cannot create ViewContext from a destroyed Viewer.')
        }

        this.event = new Event<TConfig>(viewer)
        this.sources = new ResourceManager(viewer, this.event.source)
        this.tools = new ToolManager(viewer, this.event.screen)
    }

    /**
     * 当前上下文是否已经销毁。
     */
    get isDestroyed(): boolean {
        return this.destroyed
    }

    /**
     * 销毁当前 Viewer 持有的工具、资源和事件。
     *
     * ViewContext 不一定拥有传入的 Viewer，因此默认不销毁 Viewer。
     * 二维联动视图关闭时应传入 true，主视图可由 GeoEarth 自行销毁。
     */
    destroy(destroyViewer = false): void {
        if (this.destroyed) return

        this.destroyed = true

        // 工具可能仍在使用屏幕事件和临时数据源，必须优先销毁。
        this.tools.destroy()
        this.sources.destroy()
        this.event.destroy()

        if (destroyViewer && !this.viewer.isDestroyed()) {
            this.viewer.destroy()
        }
    }
}