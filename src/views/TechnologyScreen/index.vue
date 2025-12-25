<template>
  <div class="main">
    <EarthUI></EarthUI>
    <TileHeader></TileHeader>
    <info-page></info-page>
    <function-bar></function-bar>

    <toolBox></toolBox>
  </div>
</template>

<script lang="ts" setup>
import EarthUI from '@/CesiumEarthUI/components/EarthUI.vue';
// import TileHeader from '@/CesiumEarthUI/UIPendant/TechnologyStyle/views/screen/TitleHeader/index.vue';
import TileHeader from '@/CesiumEarthUI/UIPendant/NatureStyle/titleHeader/titleHeader.vue';

import InfoPage from '@/CesiumEarthUI/UIPendant/TechnologyStyle/views/screen/infoPage/index.vue';
import FunctionBar from '@/CesiumEarthUI/UIPendant/NatureStyle/functionBar/functionBar.vue';

</script>


<style scoped>
.main {
  height: 100%;
  width: 100%;
}
</style>
