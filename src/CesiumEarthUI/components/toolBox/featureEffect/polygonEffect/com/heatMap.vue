<template>
    <div style="padding: 10px 0">
        <button class="btn btn-info btn-sm" style="margin-right: 5px" @click="createHeatMap">渲染热力图</button>
        <button class="btn btn-info btn-sm" @click="removeHeatMap">销毁热力图</button>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import CesiumEarth from '@/lib/CesiumEarth/index';
import { Cartesian3 } from 'cesium';

import { useEarthStore } from '@/stores/EarthStore';
import type { HeatMapJS } from '@/lib/CesiumEarth/ts/TileSetPlugin/HeatMap/HeatMapJS';
import type { HeatmapPoint } from '@/lib/CesiumEarth/ts/TileSetPlugin/HeatMap/lib/heatmapjs';

const earthStore = useEarthStore()
let heatmap: CesiumEarth.TileSetPlugin.HeatMap;
let heatMapObj: HeatMapJS | undefined;
let earth: CesiumEarth.Earth
let values: HeatmapPoint[] = [];
onMounted(async () => {
    const response = await fetch(new URL('/CesiumEarth/heatMap/busstop2016.json', import.meta.url))
    const json = await response.json()
    json.features.forEach((f: any) => {
        values.push({
            x: f.geometry.coordinates[0]!,
            y: f.geometry.coordinates[1]!,
            value: 100 * Math.random(),
        })
    })
    earth = await earthStore.getEarth()
})
onUnmounted(() => {
    if (heatMapObj) {
        heatMapObj.remove();
    }
})
function createHeatMap() {
    // heatmap.destroy();
    // earth.viewer3DWorkSpace.flyToDataByPid('b0c24b7d-5970-f574-a7f2-5ef0851dfcc0');
    let targetPosition = Cartesian3.fromDegrees(106.45551981195001, 29.49700, 1500);
    earth.viewer3D.scene.camera.setView({
        destination: targetPosition,
        orientation: {
            heading: 6.2243565276080295,
            pitch: -0.9203738754493909,
            roll: 6.282874205266332
        },
    });
    heatmap = new CesiumEarth.TileSetPlugin.HeatMap(earth.viewer3D);
    heatMapObj = heatmap.createHeatmapjs(values, 500, 10, {
        zoomToLayer: true
    });
}
function removeHeatMap() {
    if (heatMapObj) {
        heatMapObj.remove();
        earth.viewer3DWorkSpace.removeDataByPid('b0c24b7d-5970-f574-a7f2-5ef0851dfcc0');
    }
} 
</script>

<style lang="scss" scoped></style>
