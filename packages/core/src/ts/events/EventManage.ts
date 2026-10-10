import type { Viewer } from 'cesium'
import { CameraEvent } from './modules/CameraEvent'
import { ScreenEvent } from './modules/ScreenEvent'
import { SourceEvent } from './modules/SourceEvent'
import { ViewerEvent } from './modules/ViewerEvent'
import { InteractionEvent } from './modules/InteractionEvent'

/**
 * GeoEarth 所有事件的统一入口。
 *
 * 使用方式：
 * earth.event.screen
 * earth.event.camera
 * earth.event.viewer
 * earth.event.source
 * earth.event.interaction
 */
export class EventManage {
    readonly screen: ScreenEvent
    readonly camera: CameraEvent
    readonly viewer: ViewerEvent
    readonly source: SourceEvent
    readonly interaction: InteractionEvent

    constructor(viewer: Viewer) {
        this.screen = new ScreenEvent(viewer)
        this.camera = new CameraEvent(viewer)
        this.viewer = new ViewerEvent()
        this.source = new SourceEvent()
        this.interaction = new InteractionEvent()
    }

    destroy(): void {
        this.screen.destroy()
        this.camera.destroy()
        this.viewer.destroy()
        this.source.destroy()
        this.interaction.destroy()
    }
}
