import type { Viewer } from 'cesium'
import type { SourceEvent } from '../events/modules/SourceEvent'
import { ImageryManager } from './managers/ImageryManager'
import { ResourceItem, SourceType, type ImageryResourceItem } from './types'

/**
 * 资源统一入口。
 *
 * ResourceManage 只负责资源类型分发，
 * 具体实现由对应的子管理器负责。
 */
export class ResourceManage {
    public readonly imagery: ImageryManager

    constructor(viewer: Viewer, sourceEvent: SourceEvent) {
        this.imagery = new ImageryManager(viewer, sourceEvent)
    }

    async add(type: SourceType, config: ResourceItem): Promise<unknown> {
        switch (type) {
            case SourceType.LAYER:
                return this.imagery.add(config as ImageryResourceItem)

            case SourceType.TERRAIN:
            case SourceType.MODEL:
            case SourceType.TILESET:
            case SourceType.GEOJSON:
            case SourceType.POI:
                throw new Error(`Resource type "${type}" has not been implemented.`)

            default:
                throw new Error(`Unsupported resource type: ${String(type)}`)
        }
    }

    remove(type: SourceType, id: string): boolean {
        switch (type) {
            case SourceType.LAYER:
                return this.imagery.remove(id)

            case SourceType.TERRAIN:
            case SourceType.MODEL:
            case SourceType.TILESET:
            case SourceType.GEOJSON:
            case SourceType.POI:
                throw new Error(`Resource type "${type}" has not been implemented.`)

            default:
                return false
        }
    }

    get(type: SourceType, id: string): unknown {
        switch (type) {
            case SourceType.LAYER:
                return this.imagery.get(id)

            default:
                return undefined
        }
    }

    has(type: SourceType, id: string): boolean {
        return this.get(type, id) !== undefined
    }

    destroy(): void {
        this.imagery.destroy()
    }
}