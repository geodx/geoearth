import type { ResourceItem } from '../types';
import { createAMapImagery, createAMapLabels, createAMapVector, } from './amap';
import { createBingImagery, createBingLabels } from './bing';
import { createMapboxSatellite } from './mapbox';
import { createCyclOSM, createOSMStandard } from './osm';
import { createIonWorldTerrain } from './terrain';
export class ResourcePresets {
    constructor(
        private readonly load: (item: ResourceItem) => Promise<unknown>,
    ) { }

    addWorldTerrain() {
        return this.load(createIonWorldTerrain());
    }


    /** 加载高德影像 */
    addAMapImagery() {
        return this.load(createAMapImagery());
    }

    /** 加载高德电子地图 */
    addAMapVector() {
        return this.load(createAMapVector());
    }

    /** 加载高德地名标注 */
    addAMapLabels() {
        return this.load(createAMapLabels());
    }

    /** 加载 Bing 卫星影像 */
    addBingImagery() {
        return this.load(createBingImagery());
    }

    /** 加载 Bing 卫星影像＋标注 */
    addBingLabels() {
        return this.load(createBingLabels());
    }

    /** 加载 OSM 标准地图 */
    addOSMStandard() {
        return this.load(createOSMStandard());
    }

    /** 加载 CyclOSM 骑行地图 */
    addCyclOSM() {
        return this.load(createCyclOSM());
    }

    /** 加载 Mapbox 卫星影像 */
    addMapboxSatellite() {
        return this.load(createMapboxSatellite());
    }


}