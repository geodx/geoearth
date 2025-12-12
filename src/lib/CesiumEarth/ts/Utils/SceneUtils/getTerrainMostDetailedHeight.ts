import { Viewer, Cartographic, sampleTerrainMostDetailed } from 'cesium';

// 获取地形最精确的高程，地形数据源链接可能有些数据残缺，所以需要判断
async function getTerrainMostDetailedHeight(viewer: Viewer, longitude: number, latitude: number) {

    // await getEarth()?.thenLoadComplete();

    // 地形为空（标准椭球）
    if (!viewer.terrainProvider.availability) {
        console.log('地形为空（标准椭球）');
        return 0;
    }

    let terrainProvider = viewer.terrainProvider;
    let updatedPositions = await sampleTerrainMostDetailed(terrainProvider, [
        Cartographic.fromDegrees(longitude, latitude)
    ]);

    return updatedPositions[0]?.height || 0;
}

export { getTerrainMostDetailedHeight };
