import { ImageryScheme, SourceType } from '../types';
import type { ImageryResourceItem } from '../types';

/** 创建 Bing 卫星影像配置 */
export function createBingImagery(defaultLoad = true,): ImageryResourceItem {
    return {
        id: 'dd7813c4-dd2c-2ce4-7ff3-af62a8b97255',
        name: 'Bing Maps Aerial',
        catalog: '基础影像',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.ION,
            assetId: 2,
        },
    };
}

/** 创建 Bing 卫星影像＋标注配置 */
export function createBingLabels(defaultLoad = true,): ImageryResourceItem {
    return {
        id: '5bc9728a-2ad1-8160-70c1-9ae4a14876a3',
        name: 'Bing Maps Aerial With Labels',
        catalog: '基础影像',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.ION,
            assetId: 3,
        },
    };
}