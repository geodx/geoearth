import type { Viewer } from 'cesium';
import { createViewer } from './viewer/createViewer';

import { PerformanceManager } from './performance';

import { StartAnimation } from './camera/animations/StartAnimation';
import { CameraManager } from './camera/CameraManager';
import { ConfigManager } from './config/ConfigManager';
import { Config } from './config/types';
import { EventManager } from './events/EventManager';
import { ViewerEventType } from './events/types';
import { InteractionManager } from './interaction';
import { loadSources, ResourceManager } from './sources';
import { ToolManager } from './tools/ToolManager';
import { WidgetManager } from './widgets';

export class GeoEarth {
    public readonly viewer: Viewer
    public readonly camera: CameraManager
    public readonly config: ConfigManager

    public readonly performance: PerformanceManager

    public readonly event: EventManager

    public readonly sources: ResourceManager

    public readonly tools: ToolManager

    public readonly widgets: WidgetManager
    public readonly interaction: InteractionManager

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
        this.config = new ConfigManager(config);
        // 初始化Viewer
        this.viewer = createViewer(container, options, this.config.getConfig())

        // 初始化事件
        this.event = new EventManager(this.viewer)
        this.performance = new PerformanceManager(this.viewer)

        this.startAnimation = new StartAnimation(this.viewer)
        this.camera = new CameraManager(this.viewer, this.event.camera, () => {
            if (this.startAnimation.isPlaying) this.startAnimation.stop()
        })

        this.sources = new ResourceManager(this.viewer, this.event.source, this.camera)

        this.tools = new ToolManager(this.viewer, this.event.screen)

        this.interaction = new InteractionManager(this.viewer, this.event.screen, this.event.interaction, this.tools.draw)

        this.widgets = new WidgetManager(this.viewer, this, (container, options, config) => {
            return new GeoEarth(container, options, config)
        },)

        this.viewer.container.ownerDocument.addEventListener('visibilitychange', this.handleVisibilityChange)

        this.readyPromise = this.initialize()

    }

    private async initialize(): Promise<void> {
        const config = this.config.getConfig();
        /*
        * 基础地形和影像优先加载，
        * 保证开场动画播放时地球已有基础内容。
        */
        const defaultSourcesPromise = loadSources(this.viewer, this.sources, this.config)

        if (config.startup.animation) await this.startAnimation.play()

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
        this.camera.destroy()
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
