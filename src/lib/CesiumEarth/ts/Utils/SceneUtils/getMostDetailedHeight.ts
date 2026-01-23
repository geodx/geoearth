// 取从地球上对点的高程进行采样，如果这个点位没有 3DTiles 或 模型，则取地形高
import type { WorldDegree } from '../../Impl/Declare';
import { Cartesian3Tool } from '../CoordinateTool/Cartesian3Tool';
import { CartographicTool } from '../CoordinateTool/CartographicTool';
import { Cartesian3, Viewer } from 'cesium';
import { getTerrainMostDetailedHeight } from './getTerrainMostDetailedHeight';

async function getMostDetailedHeight(viewer: Viewer, positions: WorldDegree[]) {
    positions = JSON.parse(JSON.stringify(positions));
    // 获取模型高度
    const inModelList = await viewer.scene.clampToHeightMostDetailed(Cartesian3Tool.formCartographicObjS(positions));
    const inModelHeightList = inModelList.filter((c: Cartesian3 | undefined) => !!c).map((c: Cartesian3) => CartographicTool.formCartesian3(c)) || [];
    // 获取地形高度
    let inTerrainList = [];
    if (inModelHeightList.length === 0) {
        for (let i = 0; i < positions.length; i++) {
            const longitude = positions[i]?.longitude
            const latitude = positions[i]?.latitude
            if (!longitude || !latitude) continue
            inTerrainList.push({
                longitude: longitude,
                latitude: latitude,
                height: await getTerrainMostDetailedHeight(viewer, longitude, latitude)
            });
        }
    }

    for (let i = 0; i < positions.length; i++) {
        // 如果模型高度存在，则取模型高度
        if (inModelHeightList[i]?.height) {
            positions[i]!.height = inModelHeightList[i]!.height;
            // console.log('模型高度', inModelHeightList[i].height);
        }
        // 如果模型高度不存，则取地形高度
        else if (inTerrainList[i]?.height) {
            positions[i]!.height = inTerrainList[i]!.height;
            // console.log('地形高度', inTerrainList[i].height);
        }
        // 如果地形高度不存在，则取 0
        else {
            positions[i]!.height = 0;
        }
    }
    return positions;
}


export { getMostDetailedHeight };
