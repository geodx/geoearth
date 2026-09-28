import { ResourceItem, SourceType } from "../types";


export function createIonWorldTerrain(defaultLoad = false): ResourceItem {
    return {
        id: 'geoearth-ion-world-terrain',
        name: 'Cesium World Terrain',
        // dataType: SourceType.TERRAIN,
        defaultLoad,
        show: defaultLoad,
        properties: {
            // providerType: TerrainProviderType.ION,
            assetId: 1,
            requestVertexNormals: true,
            requestWaterMask: true
        }
    }
}