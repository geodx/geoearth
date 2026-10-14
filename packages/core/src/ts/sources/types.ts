import { ArcGisMapServerImageryProvider, Cesium3DTileset, ImageryLayer, IonImageryProvider, Resource, SingleTileImageryProvider, TileMapServiceImageryProvider, UrlTemplateImageryProvider, WebMapServiceImageryProvider, WebMapTileServiceImageryProvider } from 'cesium'

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

// ==================== 影像公共参数 ====================
/**
 * 影像服务类型。
 */
export enum ImageryScheme {
    XYZ_3857 = 'xyz-3857',
    XYZ_4326 = 'xyz-4326',
    WMS = 'wms',
    WMTS = 'wmts',
    TMS = 'tms',
    SINGLE_TILE = 'singleTile',
    ION = 'ion',
    ARCGIS = 'arcgis'
}

/** 影像公共参数 */
export interface ImageryCommonProperties {
    /** 图层插入位置，不传时添加到顶部 */
    index?: number;

    /** 是否作为底图 */
    baseLayer?: boolean;

    /** Cesium ImageryLayer 的高级参数 */
    layerOptions?: ImageryLayer.ConstructorOptions;
}
/**
 * 覆盖范围 经纬度。
 */
export interface ImageryRectangle {
    west: number;
    south: number;
    east: number;
    north: number;
}

/** 使用 URL 的影像服务共有参数 */
export interface ImageryUrlProperties extends ImageryCommonProperties {
    /** 服务地址 */
    url: string | Resource;

    /** URL 查询参数，例如服务 token */
    queryParameters?: Record<string, string>;
}

/** 支持切片层级和尺寸的影像服务共有参数 */
export interface ImageryTileProperties {
    minimumLevel?: number;
    maximumLevel?: number;
    tileWidth?: number;
    tileHeight?: number;
    rectangle?: ImageryRectangle;
}

//#region  ==================== 各类影像参数 ====================
/**
 * XYZ 影像。 
 */
export interface XYZImageryProperties extends ImageryUrlProperties, ImageryTileProperties {
    scheme: ImageryScheme.XYZ_3857 | ImageryScheme.XYZ_4326;

    /** URL 中 {s} 对应的子域名 */
    subdomains?: string | string[];

    /** Cesium 提供器的高级参数 */
    providerOptions?: Partial<Omit<UrlTemplateImageryProvider.ConstructorOptions, 'url' | 'rectangle' | 'tilingScheme'>>;
}
/** WMS 影像 */
export interface WMSImageryProperties extends ImageryUrlProperties, ImageryTileProperties {
    scheme: ImageryScheme.WMS;

    /** 图层名称，多个名称以逗号分隔 */
    layers: string;

    /** GetMap 请求参数 */
    parameters?: Record<string, unknown>;

    /** 是否启用要素拾取 */
    enablePickFeatures?: boolean;

    providerOptions?: Partial<Omit<WebMapServiceImageryProvider.ConstructorOptions, 'url' | 'rectangle'>>;
}
/** WMTS 影像 */
export interface WMTSImageryProperties
    extends ImageryUrlProperties, ImageryTileProperties {
    scheme: ImageryScheme.WMTS;

    /** 图层名称 */
    layer: string;

    /** 样式名称，按服务配置填写 */
    style: string;

    /** 切片矩阵集编号 */
    tileMatrixSetID: string;

    /** 各层级对应的切片矩阵标识 */
    tileMatrixLabels?: string[];

    /** 图片格式，例如 image/png */
    format?: string;

    providerOptions?: Partial<Omit<WebMapTileServiceImageryProvider.ConstructorOptions, 'url' | 'rectangle'>>;
}
/** TMS 影像 */
export interface TMSImageryProperties extends ImageryUrlProperties, ImageryTileProperties {
    scheme: ImageryScheme.TMS;

    /** 图片扩展名，例如 png */
    fileExtension?: string;

    providerOptions?: Partial<Omit<TileMapServiceImageryProvider.ConstructorOptions, 'rectangle'>>;
}
/** 单张影像 */
export interface SingleTileImageryProperties extends ImageryUrlProperties {
    scheme: ImageryScheme.SINGLE_TILE;

    /**
     * 图片覆盖范围。
     */
    rectangle?: ImageryRectangle;

    providerOptions?: Partial<Omit<SingleTileImageryProvider.fromUrlOptions, 'rectangle'>>;
}
/** Cesium ion 影像 */
export interface IonImageryProperties extends ImageryCommonProperties {
    scheme: ImageryScheme.ION;

    /** ion 资源编号 */
    assetId: number;

    /** ion 访问令牌 */
    accessToken?: string;

    providerOptions?: Partial<Omit<IonImageryProvider.ConstructorOptions, 'accessToken'>>;
}
/** ArcGIS MapServer 影像 */
export interface ArcGisImageryProperties extends ImageryUrlProperties {
    scheme: ImageryScheme.ARCGIS;

    /** 子图层编号，多个编号以逗号分隔 */
    layers?: string;

    /** 是否优先使用服务端缓存切片 */
    usePreCachedTilesIfAvailable?: boolean;

    /** 是否启用要素拾取 */
    enablePickFeatures?: boolean;

    maximumLevel?: number;
    tileWidth?: number;
    tileHeight?: number;
    rectangle?: ImageryRectangle;

    providerOptions?: Partial<Omit<ArcGisMapServerImageryProvider.ConstructorOptions, 'rectangle'>>;
}
//#endregion


// ==================== 影像类型映射 ====================

/** 每个 scheme 对应的完整参数类型 */
export interface ImageryPropertiesMap {
    [ImageryScheme.XYZ_3857]: XYZImageryProperties & { scheme: ImageryScheme.XYZ_3857; };

    [ImageryScheme.XYZ_4326]: XYZImageryProperties & { scheme: ImageryScheme.XYZ_4326; };

    [ImageryScheme.WMS]: WMSImageryProperties;
    [ImageryScheme.WMTS]: WMTSImageryProperties;
    [ImageryScheme.TMS]: TMSImageryProperties;
    [ImageryScheme.SINGLE_TILE]: SingleTileImageryProperties;
    [ImageryScheme.ION]: IonImageryProperties;
    [ImageryScheme.ARCGIS]: ArcGisImageryProperties;
}

/**
 * 影像资源专属参数。
 */
export type ImageryProperties<T extends ImageryScheme = ImageryScheme> = ImageryPropertiesMap[T];

/**
 * 影像资源配置。
 *
 */
export type ImageryResourceItem<T extends ImageryScheme = ImageryScheme> = ResourceItem<ImageryProperties<T>>;

// ==================== 3D Tiles 参数 ====================
/** 3D Tiles 配置参数  */
export type TilesetProperties = {
    /** tileset.json 地址 */
    url: string | Resource;

    /** 最大屏幕空间误差 */
    maximumScreenSpaceError?: number;

    /** Cesium3DTileset 的高级参数 */
    tilesetOptions?: Partial<Cesium3DTileset.ConstructorOptions>;
}


export enum TerrainScheme {
    CESIUM = 'cesium',
    ION = 'ion',
    VR_THE_WORLD = 'vr-the-world',
}


