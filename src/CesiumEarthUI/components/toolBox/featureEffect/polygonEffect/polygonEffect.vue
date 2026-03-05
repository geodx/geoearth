<template>
    <div class="toolRow">
        <button class="btn btn-info btn-sm" style="margin-right: 5px" @click="start">特效演示</button>
        <button class="btn btn-info btn-sm" @click="reset">清空效果</button>
        <heat-map></heat-map>
    </div>
</template>

<script lang="ts" setup>
import { Color, Cartesian3 } from 'cesium';
import geoJson from './arealabel.json';
import HeatMap from './com/heatMap.vue';
import { onMounted, onUnmounted } from 'vue';
import { useEarthStore } from '@/stores/EarthStore';
import CesiumEarth from '@/lib/CesiumEarth';
const earthStore = useEarthStore()
const colors = [
    Color.AQUA,
    Color.GREEN,
    Color.YELLOW,
    Color.RED
];

let labels = [
    {
        position: Cartesian3.fromDegrees(103.88545983932153, 36.033216960244246, 0),
        label: '沿河区'
    },
    {
        position: Cartesian3.fromDegrees(103.87214667212257, 36.038301982724796, 0),
        label: '环城区'
    },
    {
        position: Cartesian3.fromDegrees(103.86194888078703, 36.03969446525105, 0),
        label: '封控区'
    },
    {
        position: Cartesian3.fromDegrees(103.85091307483806, 36.041102519445715, 0),
        label: '核心区'
    }
];

let areaLabel: any;
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
})
onUnmounted(() => {
    reset();
})
function start() {
    reset();
    earth.viewer3D.scene.globe.depthTestAgainstTerrain = false;
    const features = geoJson.features;
    areaLabel = new CesiumEarth.SuperiorEntity.AreaLabel(
        earth.viewer3D, colors, labels, features
    );
    areaLabel.init();

    earth.viewer3D.scene.camera.setView({
        destination: new Cartesian3(-1238875.9606814845, 5021694.589907374, 3731291.006898492),
        orientation: {
            heading: 6.2243565276080295,
            pitch: -0.9203738754493909,
            roll: 6.282874205266332
        },
    });
}
function reset() {
    areaLabel && areaLabel.destroy();
    earth.viewer3D.scene.globe.depthTestAgainstTerrain = true;

} 
</script>


<style lang="scss" scoped>
.toolRow {
    text-align: center;
}
</style>
