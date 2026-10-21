import type { CameraManager } from '../../camera/CameraManager'
import {
    CesiumTerrainProvider, EllipsoidTerrainProvider, IonResource,
    Resource, TerrainProvider, Viewer,
    VRTheWorldTerrainProvider
} from "cesium";
import { TerrainScheme } from "..";
import { TerrainResourceItem } from "../types";
import { CesiumData } from "./data/CesiumData";

export class TerrainManager extends CesiumData<TerrainProvider> {
    constructor(viewer: Viewer, camera: CameraManager) {
        super(viewer, camera);
    }

    async addData(sourceItem: TerrainResourceItem): Promise<TerrainProvider> {
        const prop = sourceItem.properties;
        const options = {
            requestVertexNormals: prop.requestVertexNormals ?? false,
            requestWaterMask: prop.requestWaterMask ?? false,
        };

        let terrainProvider: TerrainProvider;
        switch (prop.scheme) {
            case TerrainScheme.ION: {
                const resource = await IonResource.fromAssetId(
                    prop.assetId ?? 1,
                    { accessToken: prop.accessToken },
                );
                terrainProvider = await CesiumTerrainProvider.fromUrl(
                    resource,
                    options,
                );
                break;
            }
            case TerrainScheme.CESIUM:
                terrainProvider = await CesiumTerrainProvider.fromUrl(
                    new Resource({
                        url: prop.url,
                        queryParameters: prop.queryParameters,
                    }),
                    options,
                );
                break;
            case TerrainScheme.VR_THE_WORLD:
                terrainProvider = await VRTheWorldTerrainProvider.fromUrl(
                    new Resource({
                        url: prop.url,
                        queryParameters: prop.queryParameters,
                    }),
                );
                break;
            default:
                throw new Error('不支持的地形服务类型。');
        }

        this.removeAll();
        this.viewer.terrainProvider = terrainProvider;
        this.sourcesItems.push(sourceItem);
        this.instancesMap.set(sourceItem.id, terrainProvider);
        return terrainProvider;
    };

    async flyToById(id: string): Promise<boolean> {
        const item = this.getSourceItemById(id) as TerrainResourceItem | null;
        const bounds = item?.properties.rectangle;
        if (!bounds) return false;
        return this.camera.flyToExtent(bounds);
    }

    removeById(id: string): boolean {
        const provider = this.instancesMap.get(id);
        if (!provider) return false;
        // 移除当前地形后恢复为椭球地球。
        if (this.viewer.terrainProvider === provider) {
            this.viewer.terrainProvider = new EllipsoidTerrainProvider();
        }
        this.instancesMap.delete(id);
        this.sourcesItems = this.sourcesItems.filter(item => item.id !== id);
        return true;
    }
    destroy(): boolean {
        this.removeAll();
        return true;
    }

}