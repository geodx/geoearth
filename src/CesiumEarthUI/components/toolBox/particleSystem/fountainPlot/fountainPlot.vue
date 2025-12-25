<template>

    <fountainContent v-if="show"></fountainContent>

</template>
<script lang="ts" setup>
import { computed } from 'vue';
import fountainContent from './fo-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('fountainPlot');
}) 
</script>
