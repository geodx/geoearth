<template>

    <sa-content v-if="show"></sa-content>

</template>
<script lang="ts" setup>
import { computed } from 'vue';
import SaContent from './sa-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('spatialAnalysis');
}) 
</script>


<style lang="scss" scoped></style>
