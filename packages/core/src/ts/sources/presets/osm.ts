import { ImageryScheme, SourceType } from '../types';
import type { ImageryResourceItem } from '../types';

/** 创建 OSM 标准地图配置 */
export function createOSMStandard(
    defaultLoad = true,
): ImageryResourceItem {
    return {
        id: 'b4d62340-c25a-03b2-460f-4f5d74e31d1e',
        name: 'OSM 标准地图',
        catalog: '电子地图',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.XYZ_3857,
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            minimumLevel: 0,
            maximumLevel: 19,
        },
    };
}

/** 创建 CyclOSM 骑行地图配置 */
export function createCyclOSM(
    defaultLoad = true,
): ImageryResourceItem {
    return {
        id: '4f95a081-89d4-8bc4-3dd8-597a875f49b5',
        name: 'CyclOSM 骑行地图',
        catalog: '电子地图',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.XYZ_3857,
            url: 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
            minimumLevel: 0,
            maximumLevel: 19,
        },
    };
}