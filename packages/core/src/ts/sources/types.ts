import type { Cesium3DTileset, Credit, Resource, TilingScheme } from 'cesium';

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

// ==================== 影像类型与范围 ====================

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


/** 提供器覆盖范围，经纬度，单位：度；创建时转换为 Cesium.Rectangle。 */
export interface ImageryRectangle {
    west: number;
    south: number;
    east: number;
    north: number;
}

// ==================== 影像参数 ==================== 
/** XYZ 影像，两种切片规则共用参数，由 scheme 区分。 */
export type XYZImageryProperties = {
    scheme: ImageryScheme.XYZ_3857 | ImageryScheme.XYZ_4326;
    /** 插入位置，不传时添加到顶部。 */
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    /** 服务地址，支持 {z}、{x}、{y} 等模板。 */
    url: string | Resource;
    /** URL 查询参数，例如服务 token。 */
    queryParameters?: Record<string, string>;
    /** 数据覆盖范围，单位：度。 */
    rectangle?: ImageryRectangle;
    minimumLevel?: number;
    maximumLevel?: number;
    tileWidth?: number;
    tileHeight?: number;
    /** 影像来源说明。 */
    credit?: Credit | string;

    /** {s} 对应的子域名。 */
    subdomains?: string | string[];
};

/** WMS 影像。 */
export type WMSImageryProperties = {
    scheme: ImageryScheme.WMS;
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    url: string | Resource;
    queryParameters?: Record<string, string>;
    rectangle?: ImageryRectangle;
    tilingScheme?: TilingScheme;
    minimumLevel?: number;
    maximumLevel?: number;
    tileWidth?: number;
    tileHeight?: number;
    credit?: Credit | string;

    /** 图层名称，多个名称以逗号分隔。 */
    layers: string;
    /** GetMap 请求参数，例如 format、transparent。 */
    parameters?: Record<string, unknown>;
    /** WMS 1.3.0 使用的坐标参考系统。 */
    crs?: string;
    /** WMS 1.1.1 使用的坐标参考系统。 */
    srs?: string;
    enablePickFeatures?: boolean;
};

/** WMTS 影像。 */
export type WMTSImageryProperties = {
    scheme: ImageryScheme.WMTS;
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    url: string | Resource;
    queryParameters?: Record<string, string>;
    rectangle?: ImageryRectangle;
    tilingScheme?: TilingScheme;
    minimumLevel?: number;
    maximumLevel?: number;
    tileWidth?: number;
    tileHeight?: number;
    credit?: Credit | string;

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
};

/** TMS 影像，通过 fromUrl 创建。 */
export type TMSImageryProperties = {
    scheme: ImageryScheme.TMS;
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    url: string | Resource;
    queryParameters?: Record<string, string>;
    rectangle?: ImageryRectangle;
    minimumLevel?: number;
    maximumLevel?: number;
    credit?: Credit | string;

    /** 图片扩展名，例如 png。 */
    fileExtension?: string;
};

/** 单张影像，通过 fromUrl 自动读取图片尺寸。 */
export type SingleTileImageryProperties = {
    scheme: ImageryScheme.SINGLE_TILE;
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    url: string | Resource;
    queryParameters?: Record<string, string>;
    /** 图片覆盖范围，单位：度；省略时使用全球范围。 */
    rectangle?: ImageryRectangle;
    credit?: Credit | string;
};

/** Cesium ion 影像，通过 fromAssetId 创建。 */
export type IonImageryProperties = {
    scheme: ImageryScheme.ION;
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    assetId: number;
    accessToken?: string;
};

/** ArcGIS MapServer 影像，通过 fromUrl 创建。 */
export type ArcGisImageryProperties = {
    scheme: ImageryScheme.ARCGIS;
    index?: number;
    baseLayer?: boolean;
    /** 图层透明度，范围 0～1，默认 1。 */
    alpha?: number;

    url: string | Resource;
    queryParameters?: Record<string, string>;
    rectangle?: ImageryRectangle;
    maximumLevel?: number;
    credit?: Credit | string;

    /** 子图层编号，多个编号以逗号分隔。 */
    layers?: string;
    /** 是否优先使用服务端缓存切片。 */
    usePreCachedTilesIfAvailable?: boolean;
    enablePickFeatures?: boolean;
};

// ==================== 影像类型映射 ====================

/** 通过 scheme 取得对应参数类型，保留各服务的必填字段检查。 */
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

/** 指定泛型代表某种服务；省略泛型代表全部影像服务的联合类型。 */
export type ImageryProperties<T extends ImageryScheme = ImageryScheme> =
    ImageryPropertiesMap[T];

/** 供影像管理器及配置列表使用的资源别名。 */
export type ImageryResourceItem<T extends ImageryScheme = ImageryScheme> =
    ResourceItem<ImageryProperties<T>>;

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

/** 支持 ResourceItem<TileSet> 的简短别名。 */
export type TileSet = TilesetProperties;


export enum TerrainScheme {
    CESIUM = 'cesium',
    ION = 'ion',
    VR_THE_WORLD = 'vr-the-world',
}


