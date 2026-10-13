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
        // TODO 资源访问合法性

        config.id ||= SafeTool.uuid()
        config.showInTree ??= true  // 默认在资源树中显示
        config.defaultLoad ??= true // 默认自动加载
        config.show ??= true        // 加载后默认显示

        let old = this.getNodes().find(item => sourceItem.pid === item.pid);

        switch (config.sourceType) {
            case SourceType.LAYER:
                return this.imagery.add(config as ImageryResourceItem)

            case SourceType.TERRAIN:
            case SourceType.MODEL:
            case SourceType.TILESET:
            case SourceType.GEOJSON:
            case SourceType.POI:
                throw new Error(`Resource type "${config.sourceType}" has not been implemented.`)

            default:
                throw new Error(`Unsupported resource type: ${String(config.sourceType)}`)
        }
    }
    /**
     * 移除数据
     * @param id 
     * @returns 
     */
    removeDataById(id: string): boolean {
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
    flyToDataByPid(id: string): void {
        const config = this.getConfigById(id)
        if (!config) return

        switch (config.sourceType) {
            case SourceType.LAYER:
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


    /** 获取所有已加载资源的实例 */
    getAllInstances(): unknown[] {
        return [
            ...this.imageryManage.getAll()
        ]
    }
    destroy(): void {
        this.imageryManage.destroy()
    }
}