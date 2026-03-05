/****************************************************************************
名称：几何特效 显隐控制器
最后修改日期：2022-04-20
****************************************************************************/

<template>
    <FEContent v-if="show"></FEContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

import FEContent from './fe-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('featureEffect');
}) 
</script>
