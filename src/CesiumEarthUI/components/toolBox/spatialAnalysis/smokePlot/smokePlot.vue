<template>
    <smokeContent v-if="show"></smokeContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import smokeContent from './sm-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('smokePlot');
}) 
</script>
