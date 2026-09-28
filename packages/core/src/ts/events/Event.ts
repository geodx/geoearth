import type { Viewer } from 'cesium'
import { CameraEvent } from './modules/CameraEvent'
import { ConfigEvent } from './modules/ConfigEvent'
import { ScreenEvent } from './modules/ScreenEvent'
import { SourceEvent } from './modules/SourceEvent'
import { ViewerEvent } from './modules/ViewerEvent'

/**
 * GeoEarth 所有事件的统一入口。
 *
 * 使用方式：
 * earth.event.screen
 * earth.event.camera
 * earth.event.viewer
 * earth.event.source
 * earth.event.config
 */
export class Event<TConfig = unknown> {
    readonly screen: ScreenEvent
    readonly camera: CameraEvent
    readonly viewer: ViewerEvent
    readonly source: SourceEvent
    readonly config: ConfigEvent<TConfig>

    constructor(viewer: Viewer) {
        this.screen = new ScreenEvent(viewer)
        this.camera = new CameraEvent(viewer)
        this.viewer = new ViewerEvent()
        this.source = new SourceEvent()
        this.config = new ConfigEvent<TConfig>()
    }

    destroy(): void {
        this.screen.destroy()
        this.camera.destroy()
        this.viewer.destroy()
        this.source.destroy()
        this.config.destroy()
    }
}