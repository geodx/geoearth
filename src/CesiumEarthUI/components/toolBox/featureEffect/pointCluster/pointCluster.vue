<template>
    <div class="toolRow">
        <button class="btn btn-info btn-sm" style="margin-right: 5px" @click="start">特效演示</button>
        <button class="btn btn-info btn-sm" @click="destroy">清空效果</button>
    </div>
</template>

<script lang="ts" setup>
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { onMounted, onUnmounted } from 'vue';
const earthStore = useEarthStore()
let pointcluster: any;
let isPlaying = false
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    pointcluster = new CesiumEarth.SuperiorEntity.PointClusterGeoJson(
        earth.viewer3D,
        './app/vge/cluserPoint.json',
        { isExample: true }
    );
})
onUnmounted(() => {
    destroy()
})
function start() {
    if (isPlaying) {
        return;
    }
    isPlaying = true;
    pointcluster.init();
    pointcluster.DataLoadedEvent.addEventListener((dataSource: any) => {
        earth.viewer3D.flyTo(dataSource.entities.values);
    });
}
function destroy() {
    if (isPlaying) {
        pointcluster.destroy();
    }
    isPlaying = false;
}

</script>

<style lang="scss" scoped>
.toolRow {
    text-align: center;
}
</style>
