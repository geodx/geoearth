import {
    ArcGisMapServerImageryProvider, GeographicTilingScheme, ImageryLayer, IonImageryProvider, Rectangle, Resource,
    SingleTileImageryProvider, TileMapServiceImageryProvider,
    UrlTemplateImageryProvider, WebMapServiceImageryProvider,
    WebMapTileServiceImageryProvider, WebMercatorTilingScheme, type ImageryProvider, type Viewer
} from 'cesium';
import type { SourceEvent } from '../../events/modules/SourceEvent';
import { SourceEventType } from '../../events/types';
import { ImageryScheme, SourceType, type ImageryResourceItem } from '../types';
import { CesiumData } from './data/CesiumData';

/**
 * 影像图层管理器。
 *
 * 负责影像图层的创建、查找、显示、隐藏、排序、删除和销毁。
 */
export class ImageryManage extends CesiumData<ImageryLayer> {
    private sourceEvent: SourceEvent
    constructor(viewer: Viewer, sourceEvent: SourceEvent) {
        super(viewer);
        this.sourceEvent = sourceEvent;
        this.bindLayersEvents();
    }
    // 监听 Cesium 数据变化
    private bindLayersEvents(): void {
        // 监听图层集合的变化，如果没有通过工作区的增删方法来操作地球，工作区也要进行状态同步
        this.viewer.imageryLayers.layerRemoved.addEventListener((removedLayer) => {
            for (const [id, layer] of this.instancesMap) {
                if (layer !== removedLayer) continue
                // Cesium 已经删除图层，只清理包内记录。
                this.removeById(id)
                this.sourceEvent.raiseEvent(
                    SourceEventType.REMOVE,
                    {
                        type: SourceEventType.REMOVE,
                        sourceType: SourceType.IMAGERY,
                        source: layer,
                        id
                    }
                )
                break
            }
        })
    }
    /**
     * 添加影像图层。 
     */
    async addData(config: ImageryResourceItem): Promise<ImageryLayer> {
        const provider = await this.createProvider(config)
        const layer = this.addImageryProvider(provider, config)

        return layer
    }

    async flyToById(id: string): Promise<boolean> {
        const layer = this.getInstancesById(id);
        if (!layer) return false;
        return this.viewer.flyTo(layer, {
            duration: 2,
        });
    }
    /**
     * 删除指定影像图层。
     */
    removeById(id: string): boolean {
        let removeRes = false
        const instance = this.getInstancesById(id)
        this.sourcesItems = this.sourcesItems.filter(item => item.id !== id)

        if (instance) {
            removeRes = this.viewer.imageryLayers.remove(instance)
            if (!instance.isDestroyed()) {
                instance.destroy()
            }
            this.instancesMap.delete(id)

        }
        return removeRes
    }

    /**
     * 销毁时不再发布 REMOVE 事件，
     * 因为整个 GeoEarth 正在结束生命周期。
     */
    destroy(): boolean {
        return this.removeAll()
    }

    private async createProvider(config: ImageryResourceItem): Promise<ImageryProvider> {
        const prop = config.properties
        const scheme = prop.scheme
        switch (scheme) {
            case ImageryScheme.XYZ_3857:
            case ImageryScheme.XYZ_4326: {
                const resource = new Resource({ url: prop.url, queryParameters: prop.queryParameters });
                const rectangle = prop.rectangle ? Rectangle.fromDegrees(prop.rectangle.west, prop.rectangle.south, prop.rectangle.east, prop.rectangle.north) : undefined
                return new UrlTemplateImageryProvider({
                    url: resource,
                    rectangle: rectangle,
                    tilingScheme: prop.scheme === ImageryScheme.XYZ_3857 ? new WebMercatorTilingScheme() : new GeographicTilingScheme(),
                    minimumLevel: prop.minimumLevel,
                    maximumLevel: prop.maximumLevel,
                });
            }
            case ImageryScheme.WMS: {
                const resource = new Resource({ url: prop.url, queryParameters: prop.queryParameters });
                const rectangle = prop.rectangle ? Rectangle.fromDegrees(prop.rectangle.west, prop.rectangle.south, prop.rectangle.east, prop.rectangle.north) : undefined
                return new WebMapServiceImageryProvider({
                    url: resource,
                    rectangle: rectangle,
                    layers: prop.layers,
                });
            }
            case ImageryScheme.WMTS: {
                const resource = new Resource({ url: prop.url, queryParameters: prop.queryParameters });
                const rectangle = prop.rectangle ? Rectangle.fromDegrees(prop.rectangle.west, prop.rectangle.south, prop.rectangle.east, prop.rectangle.north) : undefined
                return new WebMapTileServiceImageryProvider({
                    url: resource,
                    rectangle: rectangle,
                    layer: prop.layer,
                    style: prop.style,
                    format: prop.format || 'image/png',
                    tileMatrixSetID: prop.tileMatrixSetID || 'default028mm',
                    maximumLevel: prop.maximumLevel,
                });
            }

            case ImageryScheme.TMS: {
                const resource = new Resource({ url: prop.url, queryParameters: prop.queryParameters });
                const rectangle = prop.rectangle ? Rectangle.fromDegrees(prop.rectangle.west, prop.rectangle.south, prop.rectangle.east, prop.rectangle.north) : undefined
                return TileMapServiceImageryProvider.fromUrl(resource, {
                    rectangle,
                    minimumLevel: prop.minimumLevel,
                    maximumLevel: prop.maximumLevel,
                });
            }

            case ImageryScheme.SINGLE_TILE: {
                const resource = new Resource({ url: prop.url, queryParameters: prop.queryParameters });
                const rectangle = prop.rectangle ? Rectangle.fromDegrees(prop.rectangle.west, prop.rectangle.south, prop.rectangle.east, prop.rectangle.north) : undefined
                return SingleTileImageryProvider.fromUrl(resource, {
                    rectangle
                })
            }
            case ImageryScheme.ION:
                return IonImageryProvider.fromAssetId(prop.assetId, {
                    accessToken: prop.accessToken,
                });

            case ImageryScheme.ARCGIS: {
                const resource = new Resource({ url: prop.url, queryParameters: prop.queryParameters });
                const rectangle = prop.rectangle ? Rectangle.fromDegrees(prop.rectangle.west, prop.rectangle.south, prop.rectangle.east, prop.rectangle.north) : undefined

                return ArcGisMapServerImageryProvider.fromUrl(resource, {
                    rectangle,
                });
            }
            default:
                throw new Error(`Unsupported imagery provider type: ${scheme}`)
        }
    }
    private addImageryProvider(provider: ImageryProvider, resourceItem: ImageryResourceItem) {
        const layer = new ImageryLayer(provider)
        layer.id = resourceItem.id
        layer.param = resourceItem
        if (resourceItem.properties.index === undefined) {
            this.viewer.imageryLayers.add(layer)
        } else {
            this.viewer.imageryLayers.add(layer, resourceItem.properties.index)
        }

        // 如果该图层是底图，则把该图层降到最底层
        if (resourceItem.properties.baseLayer) {
            this.viewer.imageryLayers.lowerToBottom(layer)
        }
        this.instancesMap.set(resourceItem.id, layer)
        this.sourcesItems.push(resourceItem)

        return layer
    }
}
