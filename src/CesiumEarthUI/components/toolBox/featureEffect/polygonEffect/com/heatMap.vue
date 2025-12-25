<template>
    <div style="padding: 10px 0">
        <button class="btn btn-info btn-sm" style="margin-right: 5px" @click="createHeatMap">渲染热力图</button>
        <button class="btn btn-info btn-sm" @click="removeHeatMap">销毁热力图</button>
    </div>
</template>

<script lang="ts" setup>
import { onUnmounted } from 'vue';
import heatData from './heatData.js';
import CesiumEarth from '@/lib/CesiumEarth/index.js';
import { Cartesian3 } from 'cesium';

let bbox = [106.4519988952, 29.5021084567, 106.4590407287, 29.5092024712];
let heatmap: any;

onUnmounted(() => {
    if (heatmap) {
        heatmap.destroy();
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
        duration: 1
    });
    heatmap = new CesiumEarth.TileSetPlugin.Heatmap(
        earth.viewer3D,
        { data: heatData },
        bbox
    );
}
function removeHeatMap() {
    if (heatmap) {
        heatmap.destroy();
        earth.viewer3DWorkSpace.removeDataByPid('b0c24b7d-5970-f574-a7f2-5ef0851dfcc0');
    }
} 
</script>

<style lang="scss" scoped></style>
