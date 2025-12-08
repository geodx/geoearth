import { CesiumTerrainProvider, createWorldTerrainAsync, EllipsoidTerrainProvider, Rectangle, Resource, VRTheWorldTerrainProvider, type TerrainProvider, type Viewer } from "cesium";
import { CesiumData } from "./impl/CesiumData";
import type { ResourceItem } from "../../Config/ResourceItem";
import type { ImageryLayerProps } from "../../Config/ResourceItem/ImageryLayerProps";
import { SceneUtils } from "../../Utils/SceneUtils";


class CesiumTerrain extends CesiumData<TerrainProvider> {
  constructor(viewer: Viewer) {
    super(viewer);
  }


  async addData(sourceItem: ResourceItem): Promise<TerrainProvider> {
    const scene = this.viewer.scene;
    const prop = sourceItem.properties as ImageryLayerProps;
    const url = prop.url;
    const queryParameters = prop.queryParameters || {};
    const scheme = prop.scheme || 'CesiumTerrainProvider';
    let terrainProvider: TerrainProvider;

    if (url === 'default') {
      terrainProvider = await createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      });
    } else {
      const resource = new Resource({ url, queryParameters });

      if (scheme === 'VRTheWorldTerrainProvider') {
        terrainProvider = await VRTheWorldTerrainProvider.fromUrl(resource, {
          credit: 'Terrain data courtesy VT M?K'
        });
      } else {
        terrainProvider = await CesiumTerrainProvider.fromUrl(resource, {
          requestVertexNormals: false,
          requestWaterMask: false,
          credit: void 0
        });
      }
    }

    this.removeAll();
    scene.terrainProvider = terrainProvider;
    this.sourcesItems.push(sourceItem);
    this.instancesMap.set(sourceItem.pid, terrainProvider);
    return terrainProvider;
  };

  async flyToByPid(pid: string): Promise<boolean> {
    const sourcesItem = this.getSourcesItemsByPid(pid);
    if (!sourcesItem) return false;
    const prop = sourcesItem.properties as ImageryLayerProps;
    const r = prop.rectangle;
    if (r) {
      return new Promise(() => {
        this.viewer.camera.flyTo({
          destination: Rectangle.fromDegrees(r.west, r.south, r.east, r.north)
        });
      });
    } else {
      return await SceneUtils.viewerFlyToLonLat(110, 40, 15000000);
    }
  }


  removeByPid(pid: string): boolean {
    const sourcesItem = this.getSourcesItemsByPid(pid);
    if (!sourcesItem) return false;
    return this.removeAll();
  }

  removeAll(): boolean {
    // 缺省球体地形（无地形数据）
    this.viewer.scene.terrainProvider = new EllipsoidTerrainProvider({});
    this.sourcesItems = [];
    this.instancesMap.clear();
    return true;
  }

  destroy(): boolean {
    return this.removeAll();
  }
}

export { CesiumTerrain };
