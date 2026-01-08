<template>
  <div class="cesium-utils">
    <viewer></viewer>
    <!-- <toolBox></toolBox> -->
    <!-- <load-bar></load-bar> -->
  </div>
</template>

<script lang="ts" setup>
import Viewer from './viewer/viewer.vue';
import toolBox from './toolBox/index.vue';
import LoadBar from './viewer/LoadBar/index.vue';


</script>

<style scoped>
.cesium-utils {
  height: 100%;
  position: relative;
}
</style>
