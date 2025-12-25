<template>
    <ws-content v-if="show"></ws-content>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import WsContent from './ws-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('waterSpecial');
}) 
</script>


<style lang="scss" scoped></style>
