import type { Viewer } from 'cesium'
import { createViewer } from './viewer/createViewer';

import { PerformanceManage } from './performance'

import { EventManage } from './events/EventManage'
import { StartAnimation } from './camera/animations/StartAnimation';
import { loadBaseSources, loadDefaultSources, ResourceManage } from './sources';
import { ToolManager } from './tools/ToolManager';
import { Config } from './config/types';
import { createConfig } from './config/createConfig';
import { WidgetManager } from './widgets';
import { ViewerEventType } from './events/types';
import { InteractionManage } from './interaction';

export class GeoEarth {
    public readonly viewer: Viewer
    // public readonly camera: CameraManage
    public readonly config: Config

    public readonly performance: PerformanceManage

    public readonly event: EventManage

    public readonly sources: ResourceManage

    public readonly tools: ToolManager

    public readonly widgets: WidgetManager
    public readonly interaction: InteractionManage

    private readonly startAnimation: StartAnimation
    private readonly readyPromise: Promise<void>
    private readonly handleVisibilityChange = () => {
        const doc = this.viewer.container.ownerDocument
        const type = doc.hidden ? ViewerEventType.PAUSE : ViewerEventType.RESUME
        this.event.viewer.raiseEvent(type, { type })
    }
    /**
     * 创建新的 GeoEarth 对象
     * @param domID     创建球的父容器（div 的 id）
     * @param option    viewer 的原参数，参照 new Cesium.Viewer(id,option)
     */
    constructor(container: string | HTMLElement, options?: Viewer.ConstructorOptions, config?: Config) {
        this.config = createConfig(config)
        // 初始化Viewer
        this.viewer = createViewer(container, options, this.config)

        // 初始化事件
        this.event = new EventManage(this.viewer)

        // this.camera = new CameraManage(this.viewer)

        this.performance = new PerformanceManage(this.viewer)

        this.startAnimation = new StartAnimation(this.viewer)

        this.sources = new ResourceManage(this.viewer, this.event.source)

        this.tools = new ToolManager(this.viewer, this.event.screen)

        this.interaction = new InteractionManage(this.viewer, this.event.screen, this.event.interaction, this.tools.draw)

        this.widgets = new WidgetManager(this.viewer)

        this.viewer.container.ownerDocument.addEventListener('visibilitychange', this.handleVisibilityChange)

        this.readyPromise = this.initialize()

    }

    private async initialize(): Promise<void> {
        /*
        * 基础地形和影像优先加载，
        * 保证开场动画播放时地球已有基础内容。
        */
        await loadBaseSources(this.sources, this.config)
        /*
        * 其他默认资源在开场动画期间并行加载。
        */
        const defaultSourcesPromise = loadDefaultSources(this.sources, this.config)

        if (this.config.startup.animation) await this.startAnimation.play()

        await defaultSourcesPromise
    }

    onCreated(callback: () => void): void {
        callback()
    }
    onReady(callback?: () => void): Promise<void> {
        return this.readyPromise.then(() => {
            callback?.()
        })
    }
    onPause(callback: () => void): () => void {
        return this.event.viewer.addEventListener(
            ViewerEventType.PAUSE,
            () => callback()
        )
    }
    onResume(callback: () => void): () => void {
        return this.event.viewer.addEventListener(
            ViewerEventType.RESUME,
            () => callback()
        )
    }
    onBeforeDestroy(callback: () => void): () => void {
        return this.event.viewer.addEventListener(
            ViewerEventType.BEFORE_DESTROY,
            () => callback()
        )
    }
    onDestroyed(callback: () => void): () => void {
        return this.event.viewer.addEventListener(
            ViewerEventType.DESTROY,
            () => callback()
        )
    }

    destroy() {
        this.event.viewer.raiseEvent(ViewerEventType.BEFORE_DESTROY,
            { type: ViewerEventType.BEFORE_DESTROY }
        )
        // 先恢复交互样式并解绑输入，再销毁被交互模块引用的资源。
        this.interaction.destroy()
        this.tools.destroy()
        this.startAnimation.destroy()
        this.sources.destroy()
        this.performance.destroy()
        this.widgets.destroy()

        if (!this.viewer.isDestroyed()) {
            this.viewer.destroy()
        }
        this.event.viewer.raiseEvent(ViewerEventType.DESTROY,
            { type: ViewerEventType.DESTROY }
        )

        this.event.destroy()
    }
}
