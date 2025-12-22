<template>
    <ppContent v-if="true"></ppContent>
</template>
<script lang="ts" setup>
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import ppContent from './pp-content.vue';
import { computed } from 'vue';
const ceStore = useCesiumEarthStore()
const show = computed(() => ceStore.comStatus('pathPlanning')) 
</script>