<template>
    <prContent v-if="show"></prContent>
</template>
<script lang="ts" setup>
import prContent from './pr-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { computed } from 'vue';
const ceStore = useCesiumEarthStore()
const show = computed(() => ceStore.comStatus('pathRoaming')) 
</script>