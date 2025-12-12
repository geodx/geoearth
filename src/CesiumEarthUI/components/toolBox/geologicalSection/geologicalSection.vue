/****************************************************************************
名称：地形剖面 显隐控制器
最后修改日期：2022-04-20
****************************************************************************/

<template>
    <gs-content v-if="show"></gs-content>
</template>

<script lang="ts" setup>
import { computed, } from 'vue';
import GsContent from './gs-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()
const show = computed(() => ceStore.comStatus('geologicalSection'))
</script>
