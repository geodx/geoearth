<template>
    <ITContent v-if="show"></ITContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import ITContent from './IT-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('ImageLayerTimeLine');
})

</script>
