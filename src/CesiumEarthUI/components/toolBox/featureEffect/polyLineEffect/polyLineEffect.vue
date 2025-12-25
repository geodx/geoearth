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
import CesiumEarth from '@/lib/CesiumEarth/index';
import { useEarthStore } from '@/stores/EarthStore';
import { onUnmounted } from 'vue';
const earthStore = useEarthStore()
let plotDataSource: any;
let isPlaying = false
onUnmounted(() => {
    reset()
})
async function start() {
    const earth = await earthStore.getEarth()
    addSuperLines();
    addMigrateLines();
    addVolumeTrialLines();
    isPlaying = true;
    plotDataSource = new CesiumEarth.PlotDataSource();
    plotDataSource.load(geoJson, {
        clampToGround: true
    });
    earth.viewer3D.dataSources.add(plotDataSource).then();
    earth.viewer3D.flyTo(plotDataSource);
}
async function reset() {
    const earth = await earthStore.getEarth()
    removeSuperLines();
    removeMigrateLines();
    removeVolumeTrial();
    if (isPlaying) {
        plotDataSource.entities.removeAll();
        earth.viewer3D.dataSources.remove(plotDataSource);
    }
    isPlaying = false;
}
function addEarthTopoLines() {
    addEarthTopo();
}
function removeEarthTopoLines() {
    removeEarthTope();
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
