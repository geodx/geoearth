import { BaseEvent } from '../base/BaseEvent'
import { ConfigEventType, type ConfigEventPayload } from '../types'

/**
 * GeoEarth 配置事件。
 *
 * LOAD：首次加载完整配置
 * CHANGE：运行期间修改配置
 * RESET：恢复默认配置
 */
export class ConfigEvent<TConfig = unknown> extends BaseEvent<ConfigEventType, ConfigEventPayload<TConfig>> {
    destroy(): void { this.removeAllEventListeners() }

}

