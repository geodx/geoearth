<template>
    <PmContent v-if="show"></PmContent>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import PmContent from './pm-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('PluginManagement');
}) 
</script>


<style lang="less" scoped></style>
