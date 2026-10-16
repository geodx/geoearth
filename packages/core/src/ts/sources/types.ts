import type { Cesium3DTileset, TilingScheme } from 'cesium';
import type { WorldRectangle } from '../viewer/types';

/**
 * GeoEarth 支持的资源类型。
 */
export enum SourceType {
    IMAGERY = 'imagery', // 影像：XYZ、WMS、WMTS、单张图片等
    TERRAIN = 'terrain', // 地形
    MODEL = 'model',     // 独立三维模型：glTF、GLB
    TILESET = 'tileset', // 3D Tiles 数据集
    GEOJSON = 'geojson', // GeoJSON 数据
    POI = 'poi',         // 兴趣点、标注
}

/**
 * 通用资源配置。
 *
 * TProperties 当前资源的专属参数类型。
 */
export interface ResourceItem<TProperties = unknown> {
    /** 资源唯一编号，不传时由资源管理器生成 */
    id?: string;
    /** 资源名称 */
    name: string;
    /** 资源分类 */
    catalog: string;
    /** 资源类型 */
    sourceType: SourceType;
    /** 是否在资源树中显示 */
    showInTree?: boolean;
    /** 是否默认加载 */
    defaultLoad?: boolean;
    /** 是否显示 */
    show?: boolean;
    /** 是否启用离线缓存 */
    offlineCache?: boolean;

    /** 资源专属参数 */
    properties: TProperties;
}

// ==================== 影像参数 ==================== 

/** SDK 支持的影像服务类型。 */
export enum ImageryScheme {
    XYZ_3857 = 'xyz-3857',
    XYZ_4326 = 'xyz-4326',
    WMS = 'wms',
    WMTS = 'wmts',
    TMS = 'tms',
    SINGLE_TILE = 'singleTile',
    ION = 'ion',
    ARCGIS = 'arcgis',
}
/** 影像公共属性，仅供本模块内的服务参数接口继承。 */
interface ImageryCommonProperties {
    /** 插入位置，不传时添加到顶部。 */
    index?: number;
    /** 是否作为底图。 */
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;
}

/** XYZ 3857 影像，使用 WebMercator 切片规则。 */
export interface XYZ3857ImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.XYZ_3857;
    /** 服务地址，支持 {z}、{x}、{y} 等模板。 */
    url: string;
    /** URL 查询参数，例如服务 token。 */
    queryParameters?: Record<string, string>;
    /** 数据覆盖范围，单位：度。 */
    rectangle?: WorldRectangle;
    minimumLevel?: number;
    maximumLevel?: number;
}

/** XYZ 4326 影像，使用 Geographic 切片规则。 */
export interface XYZ4326ImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.XYZ_4326;
    /** 服务地址，支持 {z}、{x}、{y} 等模板。 */
    url: string;
    /** URL 查询参数，例如服务 token。 */
    queryParameters?: Record<string, string>;
    /** 数据覆盖范围，单位：度。 */
    rectangle?: WorldRectangle;
    minimumLevel?: number;
    maximumLevel?: number;
}

/** WMS 影像。 */
export interface WMSImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.WMS;
    url: string;
    /** 图层名称，多个名称以逗号分隔。 */
    layers: string;
    queryParameters?: Record<string, string>;
    rectangle?: WorldRectangle;
    tilingScheme?: TilingScheme;
}

/** WMTS 影像。 */
export interface WMTSImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.WMTS;
    url: string;
    queryParameters?: Record<string, string>;
    rectangle?: WorldRectangle;
    tilingScheme?: TilingScheme;
    maximumLevel?: number;

    /** 图层名称。 */
    layer: string;
    /** 样式名称，按服务配置填写。 */
    style: string;
    /** 切片矩阵集编号。 */
    tileMatrixSetID: string;
    /** 各层级的切片矩阵标识。 */
    tileMatrixLabels?: string[];
    /** 图片格式，例如 image/png。 */
    format?: string;
}

/** TMS 影像，通过 fromUrl 创建。 */
export interface TMSImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.TMS;
    url: string;
    queryParameters?: Record<string, string>;
    rectangle?: WorldRectangle;
    minimumLevel?: number;
    maximumLevel?: number;
}

/** 单张影像，通过 fromUrl 自动读取图片尺寸。 */
export interface SingleTileImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.SINGLE_TILE;
    url: string;
    queryParameters?: Record<string, string>;
    /** 图片覆盖范围，单位：度；省略时使用全球范围。 */
    rectangle?: WorldRectangle;
}

/** Cesium ion 影像，通过 fromAssetId 创建。 */
export interface IonImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.ION;
    assetId: number;
    accessToken?: string;
}

/** ArcGIS MapServer 影像，通过 fromUrl 创建。 */
export interface ArcGisImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.ARCGIS;
    url: string;
    queryParameters?: Record<string, string>;
    rectangle?: WorldRectangle;
}


/** 通过 scheme 取得对应参数类型，保留各服务的必填字段检查。 */
export interface ImageryPropertiesMap {
    [ImageryScheme.XYZ_3857]: XYZ3857ImageryProperties;
    [ImageryScheme.XYZ_4326]: XYZ4326ImageryProperties;
    [ImageryScheme.WMS]: WMSImageryProperties;
    [ImageryScheme.WMTS]: WMTSImageryProperties;
    [ImageryScheme.TMS]: TMSImageryProperties;
    [ImageryScheme.SINGLE_TILE]: SingleTileImageryProperties;
    [ImageryScheme.ION]: IonImageryProperties;
    [ImageryScheme.ARCGIS]: ArcGisImageryProperties;
}

/** 指定泛型选择服务参数；省略泛型时支持全部影像服务。 */
export type ImageryProperties<T extends ImageryScheme = ImageryScheme> = ImageryPropertiesMap[T];

/** 供影像管理器及配置列表使用的资源别名。 */
export type ImageryResourceItem<T extends ImageryScheme = ImageryScheme> = ResourceItem<ImageryProperties<T>>;

// ==================== 3D Tiles 参数 ====================
/** 3D Tiles 配置参数  */
export type TilesetProperties = {
    /** tileset.json 地址 */
    url: string;

    /** 最大屏幕空间误差 */
    maximumScreenSpaceError?: number;

    /** Cesium3DTileset 的高级参数 */
    tilesetOptions?: Partial<Cesium3DTileset.ConstructorOptions>;
}


// ==================== Terrain 参数 ====================
export enum TerrainScheme {
    CESIUM = 'cesium',
    ION = 'ion',
    VR_THE_WORLD = 'vr-the-world',
}
/** 地形服务参数。 */
export type TerrainProperties = {
    /** 覆盖范围，单位为度，用于定位。 */
    rectangle?: WorldRectangle;
    requestVertexNormals?: boolean;
    requestWaterMask?: boolean;
} & (
        {
            scheme: TerrainScheme.CESIUM | TerrainScheme.VR_THE_WORLD;
            url: string;
            queryParameters?: Record<string, string>;
        }
        | {
            scheme: TerrainScheme.ION;
            /** 默认 1，即 Cesium World Terrain。 */
            assetId?: number;
            accessToken?: string;
        }
    );

export type TerrainResourceItem = ResourceItem<TerrainProperties>;