<template>
  <div class="main">
    <EarthUI></EarthUI>
    <!-- <TileHeader></TileHeader> -->
    <!-- <function-bar></function-bar> -->
    <info-page></info-page>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { UIConfig } from '@/config/UIConfig';

import EarthUI from '@/CesiumEarthUI/components/EarthUI.vue';
import TileHeader from '@/CesiumEarthUI/UIPendant/TechnologyStyle/views/screen/TitleHeader/index.vue';
import InfoPage from '@/CesiumEarthUI/UIPendant/TechnologyStyle/views/screen/infoPage/index.vue';
import FunctionBar from '@/CesiumEarthUI/UIPendant/NatureStyle/functionBar/functionBar.vue';



onMounted(() => {
  const ceStore = useCesiumEarthStore()
  ceStore.loadUIConfig(UIConfig)
});
</script>


<style scoped>
.main {
  height: 100%;
  width: 100%;
}
</style>
