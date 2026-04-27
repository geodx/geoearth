<template>
    <div class="toolRow">
        <button class="btn btn-info btn-sm" @click="start">特效演示</button>
        <button class="btn btn-info btn-sm" @click="reset">清空效果</button>
        <br>
        <button class="btn btn-info btn-sm" @click="addEarthTopoLines">地球拓扑</button>
        <button class="btn btn-info btn-sm" @click="removeEarthTopoLines">清除地球拓扑</button>
    </div>
</template>

<script lang="ts" setup>

import geoJson from './line.json';
import { addMigrateLines, removeMigrateLines } from './lib/PolyLineMigrate';
import { addSuperLines, removeSuperLines } from './lib/PolyLineSuper';
import { addVolumeTrialLines, removeVolumeTrial } from './lib/PolyLineVolumeTrial';
import { addEarthTopo, removeEarthTope } from './lib/EarthTopo';
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { onMounted, onUnmounted } from 'vue';
const earthStore = useEarthStore()
let plotDataSource: CesiumEarth.PlotDataSource;
let isPlaying = false
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
})
onUnmounted(() => {
    reset()
})

function start() {
    addSuperLines(earth.viewer3D);
    addMigrateLines(earth.viewer3D);
    addVolumeTrialLines(earth.viewer3D);
    isPlaying = true;
    plotDataSource = new CesiumEarth.PlotDataSource(earth.viewer3D);
    plotDataSource.load(geoJson, { clampToGround: true });
    earth.viewer3D.dataSources.add(plotDataSource).then();
    earth.viewer3D.flyTo(plotDataSource);
}
function reset() {
    removeSuperLines(earth.viewer3D);
    removeMigrateLines(earth.viewer3D);
    removeVolumeTrial(earth.viewer3D);
    if (isPlaying) {
        plotDataSource.entities.removeAll();
        earth.viewer3D.dataSources.remove(plotDataSource);
    }
    isPlaying = false;
}
function addEarthTopoLines() {
    addEarthTopo(earth.viewer3D);
}
function removeEarthTopoLines() {
    removeEarthTope(earth.viewer3D);
}

</script>


<style lang="scss" scoped>
.toolRow {
    text-align: center;
}

.toolRow button {
    margin-right: 5px;
    margin-top: 5px;
}
</style>
