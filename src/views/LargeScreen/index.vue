<template>
    <div class="main">
        <EarthUI></EarthUI>
        <NatureStyleScreen></NatureStyleScreen>
    </div>
</template>

<script lang="ts" setup>
import EarthUI from '@/CesiumEarthUI/components/EarthUI.vue';
import NatureStyleScreen from '@/CesiumEarthUI//UIPendant/NatureStyle/index.vue';

</script>


<style scoped lang="scss">
.main {
    height: 100%;
    width: 100%;
}
</style>
<style>
.cesium-infoBox {
    top: auto !important;
    right: auto !important;
    left: 30px !important;
    bottom: 80px !important;
    background: rgb(1 36 55) !important;
}

.cesium-infoBox-title {
    background: rgb(4, 46, 62) !important;
}
</style>