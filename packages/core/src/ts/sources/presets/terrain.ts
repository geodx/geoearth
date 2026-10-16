import { ResourceItem, SourceType, TerrainScheme } from "../types";



export function createIonWorldTerrain(defaultLoad = false): ResourceItem {
    return {
        id: 'geoearth-ion-world-terrain',
        name: 'Cesium World Terrain',
        catalog: '基础地形',
        sourceType: SourceType.TERRAIN,
        showInTree: true,
        defaultLoad: true,
        show: true,
        offlineCache: false,
        properties: {
            scheme: TerrainScheme.ION,
            assetId: 1,
            requestVertexNormals: true,
            requestWaterMask: true
        }
    }
}

