<template>
    <SeContent v-if="show"></SeContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import SeContent from './se-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('surfaceExcavateAnalysis');
}) 
</script>