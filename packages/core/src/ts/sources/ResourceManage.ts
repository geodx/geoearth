import { Viewer } from 'cesium'
import { SourceEvent } from '../events/modules/SourceEvent'
import { SourceEventType } from '../events/types'
import { ImageryManage } from './managers/ImageryManage'
import { ResourceItem, SourceType, type ImageryResourceItem } from './types'
import { SafeTool } from '../utils'

/**
 * 资源统一入口。
 *
 * ResourceManage 只负责资源类型分发，
 * 具体实现由对应的子管理器负责。
 */
export class ResourceManage {
    private readonly sourceEvent: SourceEvent;

    public readonly imageryManage: ImageryManage

    constructor(viewer: Viewer, sourceEvent: SourceEvent) {
        this.sourceEvent = sourceEvent;

        this.imageryManage = new ImageryManage(viewer, sourceEvent)

    }

    async addData(item: ResourceItem): Promise<unknown> {
        const config = normalizeResource(item)

        const existing = this.getSourceItemById(config.id)
        if (existing) {
            console.warn('工作区已加载该数据!不允许重复加载：', config.name);
            return this.getInstance(config.id);
        }
        try {
            let instance: unknown
            switch (config.sourceType) {
                case SourceType.IMAGERY:
                    instance = await this.imageryManage.addData(config as ImageryResourceItem)
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
        const sourceItem = this.getSourceItemById(id);
        let removeRes = false
        if (!sourceItem) return false
        const type = sourceItem.sourceType
        switch (type) {
            case SourceType.IMAGERY:
                removeRes = this.imageryManage.removeById(id)
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
    async flyToSourceById(id: string): Promise<boolean> {
        const config = this.getSourceItemById(id)
        if (!config) return false

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
                return false
        }
    }
    getSourceItemById(id: string): ResourceItem | undefined {
        return this.getAllSourceItems().find(config => config.id === id)
    }
    /** 获取所有已登记资源的配置 */
    getAllSourceItems(): ResourceItem[] {
        return [
            ...this.imageryManage.sourcesItems,
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


/** 资源访问合法性   */
function normalizeResource<T extends ResourceItem>(input: T): T {
    if (!input || typeof input !== 'object') {
        throw new Error('资源配置不能为空。');
    }

    if (!input.properties || typeof input.properties !== 'object'
        || Array.isArray(input.properties)) {
        throw new Error(`资源「${input.name}」的 properties 必须是对象。`);
    }

    // 复制资源及 properties 外层，保留内部 Cesium 对象和回调。
    const item = { ...input };
    item.properties = { ...input.properties };

    item.id ||= SafeTool.uuid();
    item.showInTree ??= true  // 默认在资源树中显示
    item.defaultLoad ??= true // 默认自动加载
    item.show ??= true        // 加载后默认显示

    item.offlineCache ??= false;

    return item;
}

