<template>
  <div class="cesium-utils">
    <viewer></viewer>
    <toolBox></toolBox>
    <load-bar></load-bar>
  </div>
</template>

<script lang="ts" setup>
import Viewer from './viewer/viewer.vue';
import toolBox from './toolBox/index.vue';
import LoadBar from './viewer/LoadBar/index.vue';
import { onMounted } from 'vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { UIConfig } from '@/config/UIConfig';


onMounted(() => {
  const ceStore = useCesiumEarthStore()
  ceStore.loadUIConfig(UIConfig)
});

</script>

<style scoped>
.cesium-utils {
  height: 100%;
  position: relative;
}
</style>
