import { ScreenSpaceEventHandler, type ScreenSpaceEventType, type Viewer } from 'cesium'
import { EventCallback, RemoveCallback, ScreenEventPayload } from '../types'

/**
 * 屏幕事件管理器。
 *
 * 整个 GeoEarth 实例只创建一个 ScreenSpaceEventHandler，
 * 普通功能通过 addEventListener 共享这个 handler。
 */
export class ScreenEvent {
  private readonly handler: ScreenSpaceEventHandler

  private readonly listeners = new Map<ScreenSpaceEventType, Set<EventCallback<ScreenEventPayload>>>()

  /**
   * 记录已经绑定到底层 Cesium handler 的事件类型，
   * 避免重复调用 setInputAction。
   */
  private readonly boundTypes = new Set<ScreenSpaceEventType>()

  constructor(viewer: Viewer) {
    this.handler = new ScreenSpaceEventHandler(
      viewer.scene.canvas
    )
  }

  addEventListener(type: ScreenSpaceEventType, listener: EventCallback<ScreenEventPayload>): RemoveCallback {
    let typeListeners = this.listeners.get(type)

    if (!typeListeners) {
      typeListeners = new Set()
      this.listeners.set(type, typeListeners)
    }

    typeListeners.add(listener)
    this.bindCesiumEvent(type)

    return () => { this.removeEventListener(type, listener) }
  }

  removeEventListener(type: ScreenSpaceEventType, listener: EventCallback<ScreenEventPayload>): boolean {
    const typeListeners = this.listeners.get(type)

    if (!typeListeners) {
      return false
    }

    const removed = typeListeners.delete(listener)

    if (typeListeners.size === 0) {
      this.listeners.delete(type)
      this.unbindCesiumEvent(type)
    }

    return removed
  }

  /**
   * 手动触发屏幕事件。
   *
   * 正常鼠标操作由 Cesium 自动转发，
   * 该方法主要用于内部模拟事件或者测试。
   */
  raiseEvent(type: ScreenSpaceEventType, payload: ScreenEventPayload): void {
    const typeListeners = this.listeners.get(type)

    if (!typeListeners) {
      return
    }

    for (const listener of [...typeListeners]) {
      listener(payload)
    }
  }

  hasEventListener(type: ScreenSpaceEventType, listener?: EventCallback<ScreenEventPayload>): boolean {
    const typeListeners = this.listeners.get(type)

    if (!typeListeners) {
      return false
    }

    return listener
      ? typeListeners.has(listener)
      : typeListeners.size > 0
  }

  removeAllEventListeners(type?: ScreenSpaceEventType): void {
    if (type !== undefined) {
      this.listeners.delete(type)
      this.unbindCesiumEvent(type)
      return
    }

    for (const boundType of this.boundTypes) {
      this.handler.removeInputAction(boundType)
    }

    this.boundTypes.clear()
    this.listeners.clear()
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