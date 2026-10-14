import { ResourceItem } from "../../types";

interface CesiumDataImpl<T> {
    sourcesItems: ResourceItem[];
    instancesMap: Map<string, T>;

    addData(sourceItem: ResourceItem): Promise<unknown>;

    getSourcesItemById(id: string): ResourceItem | null;

    getInstancesById(id: string): T | null;

    flyToById(id: string): void;

    removeById(id: string): boolean;

    removeAll(): boolean;
}

export type { CesiumDataImpl };
