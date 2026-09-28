import { ImageryLayer, Resource } from 'cesium'

export interface InitialSourceItem {
    type: SourceType
    config: ResourceItem
}

export interface SourceLoadSuccess {
    type: SourceType
    config: ResourceItem
    instance: unknown
}

export interface SourceLoadFailure {
    type: SourceType
    config: ResourceItem
    error: unknown
}

export interface SourceLoadResult {
    successes: SourceLoadSuccess[]
    failures: SourceLoadFailure[]
}
export interface ResourceItem<TProperties = unknown> {
    id?: string
    name?: string
    defaultLoad?: boolean
    show?: boolean,
    properties: TProperties
}


/**
 * GeoEarth 支持的资源类型。
 */
export enum SourceType {
    LAYER = 'layer',
    TERRAIN = 'terrain',
    MODEL = 'model',
    TILESET = 'tileset', //3D Tiles
    GEOJSON = 'geojson',
    POI = 'poi', //点
    UNKNOWN = 'unknown'
}

/**
 * 支持的影像服务类型。
 */
export enum ImageryProviderType {
    XYZ = 'xyz',
    WMS = 'wms',
    WMTS = 'wmts',
    TMS = 'tms',
    SINGLE_TILE = 'singleTile',
    ION = 'ion',
    ARCGIS = 'arcgis'
}

/**
 * 影像资源专属参数。
 */
export interface ImageryResourceProperties {
    providerType: ImageryProviderType

    /**
     * 影像服务地址。
     *
     * Ion 影像使用 assetId，可以不提供 URL。
     */
    url?: string | Resource

    /**
     * Cesium ion 资源编号。
     */
    assetId?: number

    /**
     * URL 查询参数，例如服务 token。
     */
    queryParameters?: Record<string, string>

    /**
     * 传递给 Cesium ImageryProvider 的参数。
     */
    providerOptions?: Record<string, unknown>

    /**
     * 传递给 Cesium ImageryLayer 的参数。
     */
    layerOptions?: ImageryLayer.ConstructorOptions

    /**
     * 图层插入位置。
     *
     * 不设置时添加到影像图层集合顶部。
     */
    index?: number,
    /**
     * 是否为基础影像图层。
     *
     * 基础影像图层会被放置在最底层，并且不参与图层列表的显示。
     */
    baseLayer?: boolean
}

/**
 * 影像资源配置。
 *
 */
export type ImageryResourceItem = ResourceItem<ImageryResourceProperties>

export interface InitialSourceItem {
    type: SourceType
    config: ResourceItem
}

export interface SourceLoadSuccess {
    type: SourceType
    config: ResourceItem
    instance: unknown
}

export interface SourceLoadFailure {
    type: SourceType
    config: ResourceItem
    error: unknown
}

export interface SourceLoadResult {
    successes: SourceLoadSuccess[]
    failures: SourceLoadFailure[]
}

/**
 * 获取资源唯一标识。
 *
 * 新代码优先使用 id，继续兼容旧配置中的 pid。
 */
export function getSourceId(config: { id?: string }): string {
    const id = config.id

    if (!id) {
        throw new Error('Resource config requires an id.')
    }

    return id
}