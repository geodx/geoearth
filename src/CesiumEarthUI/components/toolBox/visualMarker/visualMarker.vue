/****************************************************************************
名称：视角书签工具
最后修改日期：2022-04-23
****************************************************************************/
<template>

    <vm-content v-if="show"></vm-content>

</template>
<script lang="ts" setup>
import { computed } from 'vue';
import VmContent from './vm-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('visualMarker');
})

</script>



<style lang="scss" scoped></style>
