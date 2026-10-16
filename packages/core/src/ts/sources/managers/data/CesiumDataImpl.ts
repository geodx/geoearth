import { ResourceItem } from "../../types";

interface CesiumDataImpl<T> {
    sourcesItems: ResourceItem[];
    instancesMap: Map<string, T>;

    addData(sourceItem: ResourceItem): Promise<unknown>;

    getSourceItemById(id: string): ResourceItem | null;

    getInstanceById(id: string): T | null;

    flyToById(id: string): Promise<boolean>;

    removeById(id: string): boolean;

    removeAll(): boolean;
}

export type { CesiumDataImpl };
