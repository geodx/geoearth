<template>
  <div v-loading="loading" style="overflow:hidden;height: 100%">
    <div id="MapContainer"></div>
  </div>
</template>

<script lang="ts" setup>
import CesiumEarth from '@/lib/CesiumEarth';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useEarthStore } from '@/stores/EarthStore';
const earthStore = useEarthStore()

const loading = ref(false)
let earth: CesiumEarth.Earth
function initEarth() {

  earth.openDeBug();
  earth.createNavigation();
  earth.openOverviewMap()
  earth.viewer3D.scene.globe.depthTestAgainstTerrain = true;

  earth.thenLoadComplete().then(() => {
    loading.value = false;
  });
}

onMounted(async () => {
  loading.value = true;
  earth = new CesiumEarth.Earth('MapContainer', {
    infoBox: false,
    selectionIndicator: false,
    vrButton: false,
    geocoder: false // 是否显示地名查找控件
  });
  earthStore.setEarth(earth)
  initEarth();

})
// onBeforeUnmount(() => { if (earth) earth.destroy() })
</script>


<style>
.el-loading-mask {
  background-color: rgba(255, 255, 255, 0.15) !important;
  z-index: 10;
}

.distance-legend {
  bottom: 50px;
}

.cesium-performanceDisplay-defaultContainer {
  top: auto !important;
  bottom: 50px !important;
  left: 20px !important;
  right: auto !important;
}

.cesium-viewer-toolbar {
  top: auto !important;
  bottom: 50px;
  right: 180px !important;
}
</style>
