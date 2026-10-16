import type { ResourceItem } from '../types';
import { createIonWorldTerrain } from './terrain';

export class ResourcePresets {
    constructor(
        private readonly load: (item: ResourceItem) => Promise<unknown>,
    ) { }

    addWorldTerrain() {
        return this.load(createIonWorldTerrain(true));
    }

    // 后续 addAliyunTerrain()、addOsmImagery() 等放这里
}