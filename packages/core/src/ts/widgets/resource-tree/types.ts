import type { Viewer } from 'cesium';
import type { SourceEvent } from '../../events/modules/SourceEvent';
import type { ViewerEvent } from '../../events/modules/ViewerEvent';
import type { ResourceManager } from '../../sources/ResourceManager';
import type { ResourceItem } from '../../sources/types';

/** 只依赖资源树实际使用的能力，不要求修改 GeoEarth 构造函数。 */
export interface ResourceTreeHost {
    viewer: Viewer;
    sources: Pick<ResourceManager, 'addData' | 'removeSourceById' | 'getAllSourceItems'
        | 'getInstance' | 'isLoaded' | 'setResourceVisible' | 'flyToSourceById'>;
    config?: { getAllConfig(): ResourceItem[] };
    event: { source: SourceEvent; viewer: ViewerEvent };
}

export interface ResourceTreeOptions {
    container: string | HTMLElement;
    width?: number | string;
    height?: number | string;
    title?: string;
    draggable?: boolean;
    allowCrossCatalog?: boolean;
    /** 分类优先级；底图、地形始终单独排列在前面。 */
    catalogOrder?: string[];
    /** 不传则不写本地存储；多地球请使用不同 key。 */
    storageKey?: string;
    /** 可接入后续统一资源目录；还会合并已加载和加载事件中发现的资源。 */
    getResources?: () => ResourceItem[];
    font?: string;
    onChange?: (state: ResourceTreeState) => void;
    onError?: (error: Error) => void;
}

export interface ResourceTreeLayoutItem {
    id: string;
    catalog: string;
    base: boolean;
    order: number;
}

/** 仅保存布局，不包含服务地址、凭据、Cesium 对象或加载状态。 */
export interface ResourceTreeState {
    version: 1;
    catalogs: string[];
    items: ResourceTreeLayoutItem[];
    expanded: string[];
}

export interface ResourceTreeGroup {
    key: string;
    title: string;
    kind: 'base' | 'terrain' | 'catalog';
    items: ResourceItem[];
}
