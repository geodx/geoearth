import { EventCallback, RemoveCallback } from "../types"


/**
 * GeoEarth 通用事件基类。
 *
 * API 命名与 Cesium.Event 保持一致：
 * - addEventListener：添加监听
 * - removeEventListener：移除监听
 * - raiseEvent：触发事件
 */
export class BaseEvent<TType, TPayload> {
    private readonly listeners = new Map<TType, Set<EventCallback<TPayload>>>()

    /**
     * 添加事件监听。
     *
     * 返回取消监听函数，与 Cesium.Event.addEventListener 一致。
     */
    addEventListener(type: TType, listener: EventCallback<TPayload>): RemoveCallback {
        let typeListeners = this.listeners.get(type)

        if (!typeListeners) {
            typeListeners = new Set()
            this.listeners.set(type, typeListeners)
        }
        typeListeners.add(listener)
        return () => { this.removeEventListener(type, listener) }
    }

    /**
     * 移除指定事件监听。
     *
     * 必须传入 addEventListener 时使用的同一个函数引用。
     */
    removeEventListener(type: TType, listener: EventCallback<TPayload>): boolean {
        const typeListeners = this.listeners.get(type)

        if (!typeListeners) {
            return false
        }

        const removed = typeListeners.delete(listener)

        if (typeListeners.size === 0) {
            this.listeners.delete(type)
        }

        return removed
    }

    /**
     * 主动触发事件。
     *
     * 该方法主要供 GeoEarth 内部模块使用。
     */
    raiseEvent(type: TType, payload: TPayload): void {
        const typeListeners = this.listeners.get(type)

        if (!typeListeners) {
            return
        }

        // 创建副本，避免回调执行期间移除监听影响当前遍历。
        const currentListeners = [...typeListeners]

        for (const listener of currentListeners) {
            try {
                listener(payload)
            } catch (error) {
                console.error(`Error in event listener for type "${type}":`, error)
            }
        }
    }

    /**
     * 判断指定事件是否存在监听器。
     */
    hasEventListener(type: TType, listener?: EventCallback<TPayload>): boolean {
        const typeListeners = this.listeners.get(type)

        if (!typeListeners) {
            return false
        }

        if (!listener) {
            return typeListeners.size > 0
        }

        return typeListeners.has(listener)
    }

    /**
     * 清除监听器。
     *
     * 不传 type 时清除全部事件监听。
     */
    removeAllEventListeners(type?: TType): void {
        if (type !== undefined) {
            this.listeners.delete(type)
            return
        }

        this.listeners.clear()
    }
}