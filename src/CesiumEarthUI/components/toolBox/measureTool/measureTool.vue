/****************************************************************************
名称：量测工具 显隐控制器
最后修改日期：2022-04-20
****************************************************************************/

<template>
    <ms-content v-if="show"></ms-content>
</template>

<script lang="ts" setup>
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import MsContent from './ms-content.vue';
import { computed } from 'vue';
const ceStore = useCesiumEarthStore()
const show = computed(() => ceStore.comStatus('measureTool')) 
</script>
