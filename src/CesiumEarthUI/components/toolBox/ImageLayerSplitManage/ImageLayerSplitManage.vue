<template>
    <ISContent v-if="show"></ISContent>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import ISContent from './is-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('ImageLayerSplitManage');
})

</script>
