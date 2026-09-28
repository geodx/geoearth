import type { Viewer } from 'cesium'
import { createViewer } from './viewer/createViewer';

import { PerformanceManager } from './performance'

import { Event } from './events/Event'
import { StartAnimation } from './camera/animations/StartAnimation';
import { loadBaseSources, loadDefaultSources, ResourceManager } from './sources';
import { ToolManager } from './tools/ToolManager';
import { Config } from './config/types';
import { createConfig } from './config/createConfig';
import { WidgetManager } from './widgets';

export class GeoEarth {
    public readonly viewer: Viewer
    public readonly config: Config

    public readonly performance: PerformanceManager

    public readonly event: Event

    public readonly ready: Promise<GeoEarth>

    private startAnimation: StartAnimation;

    public readonly sources: ResourceManager

    public readonly tools: ToolManager

    public readonly widgets: WidgetManager
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
        this.event = new Event(this.viewer)

        this.performance = new PerformanceManager(this.viewer)

        this.startAnimation = new StartAnimation(this.viewer)

        this.sources = new ResourceManager(this.viewer, this.event.source)

        this.tools = new ToolManager(this.viewer, this.event.screen)

        this.widgets = new WidgetManager(this.viewer)


        this.ready = this.initialize()
    }
    private async initialize(): Promise<GeoEarth> {
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

        return this
    }
    flyHome() { }
    resize() {
        this.viewer.resize()
    }

    destroy() {
        this.tools.destroy()
        this.startAnimation.destroy()
        this.sources.destroy()
        this.performance.destroy()
        this.event.destroy()
        this.widgets.destroy()
        if (!this.viewer.isDestroyed()) {
            this.viewer.destroy()
        }
    }
}

