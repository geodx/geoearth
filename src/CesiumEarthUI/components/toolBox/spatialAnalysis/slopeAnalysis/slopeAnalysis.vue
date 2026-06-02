<template>
    <SlContent v-if="show"></SlContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import SlContent from './sl-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('slopeAnalysis');
}) 
</script>


<style lang="scss" scoped></style>
