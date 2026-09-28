import { BaseEvent } from '../base/BaseEvent' 
import { SourceEventType, SourceEventPayload } from '../types'

/**
 * 图层、地形、模型、3D Tiles 等数据源事件。
 */
export class SourceEvent extends BaseEvent<SourceEventType, SourceEventPayload> {
  destroy(): void { this.removeAllEventListeners() }
}