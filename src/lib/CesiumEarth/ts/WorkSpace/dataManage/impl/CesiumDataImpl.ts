import type { ResourceItem } from '../../../Config/ResourceItem/';

interface CesiumDataImpl<T> {
  sourcesItems: ResourceItem[];
  instancesMap: Map<string, T>;

  addData(sourceItem: ResourceItem): Promise<unknown>;

  getSourcesItemsByPid(pid: string): ResourceItem | null;

  getInstancesByPid(pid: string): T | null;

  flyToByPid(pid: string): void;

  removeByPid(pid: string): boolean;

  removeAll(): boolean;
}

export type { CesiumDataImpl };
