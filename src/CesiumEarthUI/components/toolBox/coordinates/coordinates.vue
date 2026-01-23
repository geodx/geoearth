/****************************************************************************
名称：坐标定位
描述：地图选点和定位功能
最后修改日期：2021-04-24
****************************************************************************/

<template>
    <CContent v-if="true"></CContent>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import CContent from './c-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('coordinates');
}) 
</script>
