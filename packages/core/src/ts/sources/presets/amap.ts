import { ImageryScheme, SourceType } from '../types';
import type { ImageryResourceItem } from '../types';

/** 创建高德影像配置 */
export function createAMapImagery(
    defaultLoad = true,
): ImageryResourceItem {
    return {
        id: 'ba4d5925-2278-0f89-444a-6640795adaa0',
        name: '高德影像',
        catalog: '基础影像',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.XYZ_3857,
            url: 'https://webst04.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        },
    };
}

/** 创建高德电子地图配置 */
export function createAMapVector(
    defaultLoad = true,
): ImageryResourceItem {
    return {
        id: '3e50b48c-3fe1-ccba-0935-304f5ffa0785',
        name: '高德电子地图',
        catalog: '电子地图',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.XYZ_3857,
            url: 'http://webst04.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
        },
    };
}

/** 创建高德地名标注配置 */
export function createAMapLabels(
    defaultLoad = true,
): ImageryResourceItem {
    return {
        id: 'e0ab231b-74cf-57ba-40d7-079e599fab7e',
        name: '高德地名标注',
        catalog: '地名标注',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.XYZ_3857,
            url: 'http://webst02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
            minimumLevel: 0,
            maximumLevel: 19,
        },
    };
}