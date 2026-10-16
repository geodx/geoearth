import { ImageryScheme, SourceType } from '../types';
import type { ImageryResourceItem } from '../types';

/** 创建 Mapbox 卫星影像配置 */
export function createMapboxSatellite(
    defaultLoad = true,
): ImageryResourceItem {
    return {
        id: 'a0e3058d-678c-8c87-128a-3a7b5e125939',
        name: 'Mapbox Satellite',
        catalog: '基础影像',
        sourceType: SourceType.IMAGERY,
        showInTree: true,
        defaultLoad,
        show: defaultLoad,
        offlineCache: false,
        properties: {
            scheme: ImageryScheme.XYZ_3857,
            url: 'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.webp',
            queryParameters: {
                sku: '101iWxRxn5B7w',
                access_token: 'pk.eyJ1Ijoic3ZjLW9rdGEtbWFwYm94LXN0YWZmLWFjY2VzcyIsImEiOiJjbG5sMnExa3kxNTJtMmtsODJld24yNGJlIn0.RQ4CHchAYPJQZSiUJ0O3VQ',
            },
            minimumLevel: 0,
            maximumLevel: 22,
        },
    };
}