/****************************************************************************
名称：天空盒 显隐控制器
作者：冯功耀
最后修改日期：2022-04-20
****************************************************************************/

<template>
    <SBContent v-if="true"></SBContent>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import SBContent from './sb-content.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()
const show = computed(() => ceStore.comStatus('skyBoxTool'))


</script>
