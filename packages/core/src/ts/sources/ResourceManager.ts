import { Viewer } from 'cesium'
import { SourceEvent } from '../events/modules/SourceEvent'
import { SourceEventType } from '../events/types'
import { GeoJsonManager } from './managers/GeoJsonManager'
import { ImageryManager } from './managers/ImageryManager'
import { ModelManager } from './managers/ModelManager'
import { PoiManager } from './managers/PoiManager'
import { TerrainManager } from './managers/TerrainManager'
import { TilesetManager } from './managers/TilesetManager'
import { ResourcePresets } from './presets/ResourcePresets'
import {
    GeoJsonResourceItem, ModelResourceItem, PoiResourceItem, ResourceItem,
    SourceType, TerrainResourceItem, TilesetResourceItem,
    type ImageryResourceItem
} from './types'
import { normalizeResource } from './loaders/normalizeResource'

/**
 * 资源统一入口。
 *
 * ResourceManager 只负责资源类型分发，
 * 具体实现由对应的子管理器负责。
 */
export class ResourceManager {
    private readonly sourceEvent: SourceEvent;

    public readonly imageryManager: ImageryManager
    public readonly terrainManager: TerrainManager
    public readonly modelManager: ModelManager
    public readonly tilesetManager: TilesetManager
    public readonly geoJsonManager: GeoJsonManager
    public readonly poiManager: PoiManager

    public readonly presets: ResourcePresets;
    constructor(viewer: Viewer, sourceEvent: SourceEvent) {
        this.sourceEvent = sourceEvent;

        this.imageryManager = new ImageryManager(viewer, sourceEvent)
        this.terrainManager = new TerrainManager(viewer);
        this.modelManager = new ModelManager(viewer);
        this.tilesetManager = new TilesetManager(viewer);
        this.geoJsonManager = new GeoJsonManager(viewer);
        this.poiManager = new PoiManager(viewer);

        this.presets = new ResourcePresets(item => this.addData(item));
    }

    async addData(item: ResourceItem): Promise<unknown> {
        const config = normalizeResource(item)

        const existing = this.getSourceItemById(config.id)
        if (existing) {
            if (existing.sourceType !== config.sourceType) {
                throw new Error(`资源「${config.id}」不允许更换资源类型。`);
            }

            // 不覆盖正在使用的资源配置。
            if (this.getSourceItemById(config.id)) {
                return existing;
            }
        }
        try {
            let instance: unknown
            switch (config.sourceType) {
                case SourceType.IMAGERY:
                    instance = await this.imageryManager.addData(config as ImageryResourceItem)
                    break
                case SourceType.TERRAIN:
                    instance = await this.terrainManager.addData(config as TerrainResourceItem)
                    break
                case SourceType.MODEL:
                    instance = await this.modelManager.addData(config as ModelResourceItem)
                    break
                case SourceType.TILESET:
                    instance = await this.tilesetManager.addData(config as TilesetResourceItem)
                    break
                case SourceType.GEOJSON:
                    instance = await this.geoJsonManager.addData(config as GeoJsonResourceItem)
                    break
                case SourceType.POI:
                    instance = await this.poiManager.addData(config as PoiResourceItem)
                    break
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
                removeRes = this.imageryManager.removeById(id)
                break
            case SourceType.TERRAIN:
                removeRes = this.terrainManager.removeById(id)
                break
            case SourceType.MODEL:
                removeRes = this.modelManager.removeById(id)
                break
            case SourceType.TILESET:
                removeRes = this.tilesetManager.removeById(id)
                break
            case SourceType.GEOJSON:
                removeRes = this.geoJsonManager.removeById(id)
                break
            case SourceType.POI:
                removeRes = this.poiManager.removeById(id)
                break

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
    /** 修改已加载资源的显隐，不执行加载或卸载。 */
    setResourceVisible(id: string, visible: boolean): boolean {
        const resource = this.getSourceItemById(id);
        if (!resource) return false;

        if (resource.sourceType === SourceType.TERRAIN) {
            throw new Error('地形不支持普通显隐操作，请使用地形切换或卸载。');
        }

        const instance = this.getInstance(id) as
            { show: boolean } | undefined;

        if (!instance) return false;

        const changed = instance.show !== visible;

        instance.show = visible;
        resource.show = visible;

        if (changed) {
            const type = visible
                ? SourceEventType.SHOW
                : SourceEventType.HIDE;

            this.sourceEvent.raiseEvent(type, {
                type,
                sourceType: resource.sourceType,
                source: resource,
                id,
            });
        }

        return true;
    }
    /** 判断是否已经加载。 */
    isLoaded(id: string): boolean {
        return this.getInstance(id) !== undefined;
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
                return this.imageryManager.flyToById(id)
            case SourceType.TERRAIN:
                return this.terrainManager.flyToById(id)
            case SourceType.MODEL:
                return this.modelManager.flyToById(id)
            case SourceType.TILESET:
                return this.tilesetManager.flyToById(id)
            case SourceType.GEOJSON:
                return this.geoJsonManager.flyToById(id)
            case SourceType.POI:
                return this.poiManager.flyToById(id)

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
            ...this.imageryManager.sourcesItems,
            ...this.terrainManager.sourcesItems,
            ...this.modelManager.sourcesItems,
            ...this.tilesetManager.sourcesItems,
            ...this.geoJsonManager.sourcesItems,
            ...this.poiManager.sourcesItems,
        ]
    }


    getInstance(id: string): unknown {
        return this.imageryManager.instancesMap.get(id)
            ?? this.terrainManager.instancesMap.get(id)
            ?? this.modelManager.instancesMap.get(id)
            ?? this.tilesetManager.instancesMap.get(id)
            ?? this.geoJsonManager.instancesMap.get(id)
            ?? this.poiManager.instancesMap.get(id)
    }

    destroy(): void {
        this.imageryManager.destroy()
        this.terrainManager.destroy()
        this.modelManager.destroy()
        this.tilesetManager.destroy()
        this.geoJsonManager.destroy()
        this.poiManager.destroy()
    }
}

