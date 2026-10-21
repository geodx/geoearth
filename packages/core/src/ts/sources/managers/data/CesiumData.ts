import type { CameraManager } from '../../../camera/CameraManager'
import { Viewer } from 'cesium';
import type { CesiumDataImpl } from './CesiumDataImpl';
import { ResourceItem } from '../../types';

abstract class CesiumData<T> implements CesiumDataImpl<T> {
    viewer: Viewer;
    sourcesItems: ResourceItem[];
    instancesMap: Map<string, T>;

    protected constructor(viewer: Viewer, protected readonly camera: CameraManager) {
        this.viewer = viewer;
        this.sourcesItems = [];
        this.instancesMap = new Map<string, T>();
    }

    abstract addData(sourceItem: ResourceItem): Promise<unknown>;

    abstract flyToById(id: string): Promise<boolean>;

    getInstanceById(id: string) {
        return this.instancesMap.get(id) || null;
    }

    getSourceItemById(id: string) {
        return this.sourcesItems.find(item => item.id === id) || null;
    }

    abstract removeById(id: string): boolean;

    removeAll(): boolean {
        this.sourcesItems.forEach(item => {
            this.removeById(item.id);
        });
        return true;
    }

    abstract destroy(): boolean;
}

export { CesiumData };
