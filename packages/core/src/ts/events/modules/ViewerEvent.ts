import { BaseEvent } from '../base/BaseEvent'
import type { ViewerEventPayload } from '../types'
import { ViewerEventType } from '../types'

/**
 * Viewer 生命周期和容器状态事件。
 */
export class ViewerEvent extends BaseEvent<ViewerEventType, ViewerEventPayload> {
    destroy(): void { this.removeAllEventListeners() }
}