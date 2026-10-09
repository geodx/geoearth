import { ScreenSpaceEventHandler, type ScreenSpaceEventType, type Viewer } from 'cesium'
import { BaseEvent } from '../base/BaseEvent'
import type { EventCallback, RemoveCallback, ScreenEventPayload } from '../types'

/**
 * 屏幕事件管理器。
 *
 * 整个 GeoEarth 实例只创建一个 ScreenSpaceEventHandler，
 * 普通功能通过 addEventListener 共享这个 handler。
 */
export class ScreenEvent extends BaseEvent<ScreenSpaceEventType, ScreenEventPayload> {
  private readonly handler: ScreenSpaceEventHandler

  /**
   * 记录已经绑定到底层 Cesium handler 的事件类型，
   * 避免重复调用 setInputAction。
   */
  private readonly boundTypes = new Set<ScreenSpaceEventType>()

  constructor(viewer: Viewer) {
    super()

    this.handler = new ScreenSpaceEventHandler(
      viewer.scene.canvas
    )
  }

  override addEventListener(type: ScreenSpaceEventType, listener: EventCallback<ScreenEventPayload>): RemoveCallback {
    // 先绑定底层事件，避免绑定失败后留下无效的业务监听。
    this.bindCesiumEvent(type)
    return super.addEventListener(type, listener)
  }

  override removeEventListener(type: ScreenSpaceEventType, listener: EventCallback<ScreenEventPayload>): boolean {
    const removed = super.removeEventListener(type, listener)

    if (!this.hasEventListener(type)) {
      this.unbindCesiumEvent(type)
    }

    return removed
  }

  override removeAllEventListeners(type?: ScreenSpaceEventType): void {
    super.removeAllEventListeners(type)

    if (type !== undefined) {
      this.unbindCesiumEvent(type)
      return
    }

    for (const boundType of this.boundTypes) {
      this.unbindCesiumEvent(boundType)
    }
  }

  private bindCesiumEvent(type: ScreenSpaceEventType): void {
    if (this.boundTypes.has(type)) {
      return
    }

    this.handler.setInputAction((payload: ScreenEventPayload) => {
      this.raiseEvent(type, payload)
    }, type)
    this.boundTypes.add(type)
  }

  private unbindCesiumEvent(type: ScreenSpaceEventType): void {
    if (!this.boundTypes.has(type)) {
      return
    }

    this.handler.removeInputAction(type)
    this.boundTypes.delete(type)
  }

  destroy(): void {
    this.removeAllEventListeners()

    if (!this.handler.isDestroyed()) {
      this.handler.destroy()
    }
  }
}
