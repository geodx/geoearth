<template>
    <HlContent v-if="show"></HlContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import HlContent from './hl-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('heightLimitAnalysis');
}) 
</script>


<style lang="scss" scoped></style>
