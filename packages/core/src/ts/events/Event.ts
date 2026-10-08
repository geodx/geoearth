import type { Viewer } from 'cesium'
import { CameraEvent } from './modules/CameraEvent'
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
 */
export class Event {
    readonly screen: ScreenEvent
    readonly camera: CameraEvent
    readonly viewer: ViewerEvent
    readonly source: SourceEvent

    constructor(viewer: Viewer) {
        this.screen = new ScreenEvent(viewer)
        this.camera = new CameraEvent(viewer)
        this.viewer = new ViewerEvent()
        this.source = new SourceEvent()
    }

    destroy(): void {
        this.screen.destroy()
        this.camera.destroy()
        this.viewer.destroy()
        this.source.destroy()
    }
}
