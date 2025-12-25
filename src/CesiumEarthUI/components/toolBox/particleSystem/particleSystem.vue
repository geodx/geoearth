<template>

    <pa-content v-if="show"></pa-content>

</template>
<script lang="ts" setup>
import { computed } from 'vue';
import PaContent from './pa-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('particleSystem');
}) 
</script>


<style lang="less" scoped></style>
