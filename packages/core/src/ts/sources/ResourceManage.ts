import type { Viewer } from 'cesium'
import { SourceEvent } from '../events/modules/SourceEvent'
import { ImageryManage } from './managers/ImageryManage'
import { ResourceItem, SourceType, type ImageryResourceItem } from './types'
import { SafeTool } from '../utils'
import { SourceEventType } from '../events/types'

/**
 * 资源统一入口。
 *
 * ResourceManage 只负责资源类型分发，
 * 具体实现由对应的子管理器负责。
 */
export class ResourceManage {
    private readonly viewer: Viewer;
    private readonly sourceEvent: SourceEvent;

    public readonly imageryManage: ImageryManage

    constructor(viewer: Viewer, sourceEvent: SourceEvent) {
        this.viewer = viewer;
        this.sourceEvent = sourceEvent;

        this.imageryManage = new ImageryManage(viewer, sourceEvent)

    }

    async add(config: ResourceItem): Promise<unknown> {

        const existing = this.getConfigById(id)
        if (existing) {
            console.warn('工作区已加载该数据!不允许重复加载：', config.name);
            return this.getInstance(config.id);
        }
        try {
            let instance: unknown
            switch (config.sourceType) {
                case SourceType.IMAGERY:
                    instance = await this.imageryManage.add(config as ImageryResourceItem)
                    break
                case SourceType.TERRAIN:
                case SourceType.MODEL:
                case SourceType.TILESET:
                case SourceType.GEOJSON:
                case SourceType.POI:
                    throw new Error(`资源类型 "${config.sourceType}" 尚未实现。`)
                default:
                    throw new Error(`无效的资源类型：${String(config.sourceType)}`)
            }
            this.sourceEvent.raiseEvent(SourceEventType.ADD, {
                type: SourceEventType.ADD,
                sourceType: config.sourceType,
                source: config,
            });
            return instance
        } catch (error) {
            console.error(`加载资源失败：${config.name}`, error)
            throw error
        }
    }
    /**
     * 移除数据
     * @param id 
     * @returns 
     */
    removeSourceById(id: string): boolean {
        const sourceItem = this.getConfigById(id);
        let removeRes = false
        if (!sourceItem) return false
        const type = sourceItem.sourceType
        switch (type) {
            case SourceType.LAYER:
                removeRes = this.imageryManage.removeDataById(id)
                break
            case SourceType.TERRAIN:
            case SourceType.MODEL:
            case SourceType.TILESET:
            case SourceType.GEOJSON:
            case SourceType.POI:
                throw new Error(`Resource type "${type}" has not been implemented.`)

            default:
                return false
        }
        if (removeRes) {
            this.sourceEvent.raiseEvent(SourceEventType.REMOVE, {
                type: SourceEventType.REMOVE,
                sourceType: type,
                source: sourceItem,
                id
            })
        }

        return removeRes
    }
    /**
     * 飞向资源
     * @param id 
     */
    flyToSourceById(id: string): void {
        const config = this.getConfigById(id)
        if (!config) return

        switch (config.sourceType) {
            case SourceType.IMAGERY:
                return this.imageryManage.flyToById(id)

            //todo 后续补充：
            // case SourceType.MODEL:
            //     return this.modelManage.flyToById(id)
            //
            // case SourceType.TILESET:
            //     return this.tilesetManage.flyToById(id)
            //
            // case SourceType.GEOJSON:
            //     return this.geojsonManage.flyToById(id)
            //
            // case SourceType.POI:
            //     return this.poiManage.flyToById(id)

            default:
                return
        }
    }
    getConfigById(id: string): ResourceItem | undefined {
        return this.getAllConfigs().find(config => config.id === id)
    }
    /** 获取所有已登记资源的配置 */
    getAllConfigs(): ResourceItem[] {
        return [
            ...this.imageryManage.getAllConfigs(),
            // ... this.terrainManage.getAllConfigs(),
            // ... this.modelManage.getAllConfigs(),
            // ... this.tilesetManage.getAllConfigs(),
            // ... this.geojsonManage.getAllConfigs(),
            // ... this.poiManage.getAllConfigs()
        ]
    }


    getInstance(id: string): unknown {
        return this.imageryManage.instancesMap.get(id)
        // ?? this.terrainManage.instancesMap.get(id)
        // ?? this._3DTileManage.instancesMap.get(id)
        // ?? this.gltfManage.instancesMap.get(id)
        // ?? this.poiManage.instancesMap.get(id)
    }
    destroy(): void {
        this.imageryManage.destroy()
    }
}