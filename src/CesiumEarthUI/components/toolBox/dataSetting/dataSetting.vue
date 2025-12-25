<template>
    <ds-content v-if="show"></ds-content>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import dsContent from './ds-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('dataSetting');
}) 
</script>