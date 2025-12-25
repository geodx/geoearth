<template>
    <lvContent v-if="show"></lvContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import lvContent from './lv-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('linkView');
}) 
</script>