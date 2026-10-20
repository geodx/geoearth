import { Viewer } from 'cesium';
import { ConfigManager } from '../../config/ConfigManager';
import type { ResourceManager } from '../ResourceManager';
import { SourceType } from '../types';

/**
 * 加载基础显示资源。
 *
 * 地形和影像决定地球的基础显示效果，
 * 应在模型、3D Tiles、POI 等资源之前加载。
 */
export async function loadSources(viewer: Viewer, resourceManager: ResourceManager, config: ConfigManager) {
    viewer.imageryLayers.removeAll();

    viewer.scene.skyAtmosphere.show = false;
    viewer.scene.globe.show = false;

    // 加载地球的初始默认地形
    const baseTerrainItem = config.getBaseTerrain();
    let baseTerrainPromise = null;
    if (baseTerrainItem) {
        baseTerrainPromise = resourceManager.addData(baseTerrainItem);
    }

    // 加载地球的基础地图图层
    const baseImageryItem = config.getBaseImagery();
    let baseLayerPromise = null;
    if (baseImageryItem) {
        baseLayerPromise = resourceManager.addData(baseImageryItem);
    }
    await Promise.all([baseTerrainPromise, baseLayerPromise]);

    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.globe.show = true;

    const allSources = config.getAllConfig();

    for (let i = 0; i < allSources.length; i++) {
        let item = allSources[i];
        // 优先加载影像图层
        if (item.defaultLoad && item.sourceType === SourceType.IMAGERY) {
            if (baseImageryItem && item.id === baseImageryItem.id) {
                continue;
            }
            await resourceManager.addData(item);
        }
    }

    for (let i = 0; i < allSources.length; i++) {
        let item = allSources[i];
        // 其次再加载非影像资源
        if (item.defaultLoad && item.sourceType !== SourceType.IMAGERY) {
            if (baseTerrainItem && item.id === baseTerrainItem.id) {
                // 如果该地形已经预加载过了，就不再加载了
                continue;
            }
            // 三维地图加载资源
            await resourceManager.addData(item);
        }
    }
}
