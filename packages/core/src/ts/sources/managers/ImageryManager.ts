import {
    ArcGisMapServerImageryProvider, ImageryLayer, IonImageryProvider, Resource,
    SingleTileImageryProvider, TileMapServiceImageryProvider,
    UrlTemplateImageryProvider, WebMapServiceImageryProvider,
    WebMapTileServiceImageryProvider, type ImageryProvider, type Viewer
} from 'cesium'
import type { SourceEvent } from '../../events/modules/SourceEvent'
import { SourceEventType } from '../../events/types'
import { getSourceId, ImageryProviderType, SourceType, type ImageryResourceItem } from '../types'

/**
 * 影像图层管理器。
 *
 * 负责影像图层的创建、查找、显示、隐藏、排序、删除和销毁。
 */
export class ImageryManager {
    private readonly layers = new Map<string, ImageryLayer>()
    private readonly configs = new Map<string, ImageryResourceItem>()

    constructor(private readonly viewer: Viewer, private readonly sourceEvent: SourceEvent) { }

    /**
     * 添加影像图层。
     *
     * 当相同 ID 已存在时，直接返回已有实例。
     */
    async add(config: ImageryResourceItem): Promise<ImageryLayer> {
        this.ensureAvailable()
        this.validateConfig(config)

        const id = getSourceId(config)
        const existingLayer = this.layers.get(id)
        if (existingLayer) return existingLayer

        const provider = await this.createProvider(config)

        this.ensureAvailable()
        // 等待 provider 创建期间，其他 add() 可能已经添加了这个 ID。
        const loadedLayer = this.layers.get(id)
        if (loadedLayer) return loadedLayer
        const layer = new ImageryLayer(provider, config.properties.layerOptions)

        layer.show = config.show ?? true
        //TODO 如果该图层是底图，则把该图层降到最底层
        // if (config.properties.baseLayer) {
        //     this.viewer.imageryLayers.lowerToBottom(layer)
        // }
        if (config.properties.index === undefined) {
            this.viewer.imageryLayers.add(layer)
        } else {
            this.viewer.imageryLayers.add(layer, config.properties.index)
        }

        this.layers.set(id, layer)
        this.configs.set(id, this.cloneConfig(config))

        this.sourceEvent.raiseEvent(SourceEventType.ADD, {
            type: SourceEventType.ADD,
            sourceType: SourceType.LAYER,
            source: config,
            id
        })

        return layer
    }

    /**
     * 删除指定影像图层。
     */
    remove(id: string): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        this.layers.delete(id)
        this.configs.delete(id)

        const removed = this.viewer.imageryLayers.remove(layer, true)

        if (removed) {
            this.sourceEvent.raiseEvent(SourceEventType.REMOVE, {
                type: SourceEventType.REMOVE,
                sourceType: SourceType.LAYER,
                source: layer,
                id
            })
        }

        return removed
    }

    get(id: string): ImageryLayer | undefined {
        return this.layers.get(id)
    }

    getConfig(id: string): ImageryResourceItem | undefined {
        const config = this.configs.get(id)
        return config ? this.cloneConfig(config) : undefined
    }

    has(id: string): boolean {
        return this.layers.has(id)
    }

    getAll(): ImageryLayer[] {
        return [...this.layers.values()]
    }

    getAllConfigs(): ImageryResourceItem[] {
        return [...this.configs.values()].map(config => this.cloneConfig(config))
    }

    setShow(id: string, show: boolean): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        if (layer.show === show) {
            return true
        }

        layer.show = show

        const config = this.configs.get(id)

        if (config) {
            config.show = show
        }

        const eventType = show ? SourceEventType.SHOW : SourceEventType.HIDE

        this.sourceEvent.raiseEvent(eventType, {
            type: eventType,
            sourceType: SourceType.LAYER,
            source: layer,
            id
        })

        this.viewer.scene.requestRender()

        return true
    }

    setAlpha(id: string, alpha: number): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        layer.alpha = Math.min(Math.max(alpha, 0), 1)

        this.raiseChangeEvent(id, layer)
        this.viewer.scene.requestRender()

        return true
    }

    raise(id: string): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        this.viewer.imageryLayers.raise(layer)
        this.raiseChangeEvent(id, layer)

        return true
    }

    lower(id: string): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        this.viewer.imageryLayers.lower(layer)
        this.raiseChangeEvent(id, layer)

        return true
    }

    raiseToTop(id: string): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        this.viewer.imageryLayers.raiseToTop(layer)
        this.raiseChangeEvent(id, layer)

        return true
    }

    lowerToBottom(id: string): boolean {
        this.ensureAvailable()

        const layer = this.layers.get(id)

        if (!layer) {
            return false
        }

        this.viewer.imageryLayers.lowerToBottom(layer)
        this.raiseChangeEvent(id, layer)

        return true
    }

    removeAll(): void {
        this.ensureAvailable()

        for (const id of [...this.layers.keys()]) {
            this.remove(id)
        }
    }

    /**
     * 销毁时不再发布 REMOVE 事件，
     * 因为整个 GeoEarth 正在结束生命周期。
     */
    destroy(): void {
        if (this.viewer.isDestroyed()) {
            this.layers.clear()
            this.configs.clear()
            return
        }

        for (const layer of this.layers.values()) {
            this.viewer.imageryLayers.remove(layer, true)
        }

        this.layers.clear()
        this.configs.clear()
    }

    private async createProvider(config: ImageryResourceItem): Promise<ImageryProvider> {
        const { providerType, providerOptions = {} } = config.properties

        switch (providerType) {
            case ImageryProviderType.XYZ:
                return new UrlTemplateImageryProvider({
                    ...providerOptions,
                    url: this.createResource(config)
                } as UrlTemplateImageryProvider.ConstructorOptions)

            case ImageryProviderType.WMS:
                return new WebMapServiceImageryProvider({
                    ...providerOptions,
                    url: this.createResource(config)
                } as WebMapServiceImageryProvider.ConstructorOptions)

            case ImageryProviderType.WMTS:
                return new WebMapTileServiceImageryProvider({
                    ...providerOptions,
                    url: this.createResource(config)
                } as WebMapTileServiceImageryProvider.ConstructorOptions)

            case ImageryProviderType.TMS:
                return TileMapServiceImageryProvider.fromUrl(
                    this.createResource(config),
                    providerOptions as TileMapServiceImageryProvider.ConstructorOptions
                )

            case ImageryProviderType.SINGLE_TILE:
                return SingleTileImageryProvider.fromUrl(
                    this.createResource(config),
                    providerOptions as SingleTileImageryProvider.fromUrlOptions
                )

            case ImageryProviderType.ION:
                return this.createIonProvider(config)

            case ImageryProviderType.ARCGIS:
                return ArcGisMapServerImageryProvider.fromUrl(
                    this.createResource(config),
                    providerOptions as ArcGisMapServerImageryProvider.ConstructorOptions
                )

            default:
                throw new Error(`Unsupported imagery provider type: ${String(providerType)}`)
        }
    }

    private createIonProvider(config: ImageryResourceItem): Promise<IonImageryProvider> {
        const assetId = config.properties.assetId

        if (assetId === undefined) {
            throw new Error(`Imagery resource "${getSourceId(config)}" requires properties.assetId.`)
        }

        return IonImageryProvider.fromAssetId(
            assetId,
            config.properties.providerOptions as IonImageryProvider.ConstructorOptions
        )
    }

    private createResource(config: ImageryResourceItem): Resource {

        const url = config.properties.url

        if (!url) {
            throw new Error(`Imagery resource "${getSourceId(config)}" requires properties.url.`)
        }

        if (url instanceof Resource) {
            return url
        }

        return new Resource({
            url,
            queryParameters: config.properties.queryParameters
        })
    }

    private raiseChangeEvent(id: string, layer: ImageryLayer): void {
        this.sourceEvent.raiseEvent(SourceEventType.CHANGE, {
            type: SourceEventType.CHANGE,
            sourceType: SourceType.LAYER,
            source: layer,
            id
        })
    }

    private validateConfig(config: ImageryResourceItem): void {
        const id = getSourceId(config)

        if (!config.properties?.providerType) {
            throw new Error(`Imagery resource "${id}" requires properties.providerType.`)
        }

        if (config.properties.providerType !== ImageryProviderType.ION && !config.properties.url) {
            throw new Error(`Imagery resource "${id}" requires properties.url`)
        }
    }

    /**
     * Resource、回调函数以及部分 Cesium 对象不能使用 structuredClone，
     * 因此这里只复制普通配置对象。
     */
    private cloneConfig(config: ImageryResourceItem): ImageryResourceItem {
        return {
            ...config,
            properties: {
                ...config.properties,
                queryParameters: config.properties.queryParameters ? { ...config.properties.queryParameters } : undefined,
                providerOptions: config.properties.providerOptions ? { ...config.properties.providerOptions } : undefined,
                layerOptions: config.properties.layerOptions ? { ...config.properties.layerOptions } : undefined
            }
        }
    }

    private ensureAvailable(): void {
        if (this.viewer.isDestroyed()) {
            throw new Error('Cannot use ImageryManager because Viewer has been destroyed.')
        }
    }
}