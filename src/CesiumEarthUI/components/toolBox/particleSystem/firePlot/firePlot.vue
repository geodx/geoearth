<template>

    <FireContent v-if="show"></FireContent>

</template>
<script lang="ts" setup>
import { computed } from 'vue';
import FireContent from './fire-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('firePlot');
}) 
</script>