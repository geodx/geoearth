<template>
    <vr-content v-if="show"></vr-content>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import VrContent from './vr-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('vr3d');
}) 
</script>


<style lang="scss" scoped></style>
