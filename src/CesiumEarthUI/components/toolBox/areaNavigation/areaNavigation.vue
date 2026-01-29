/****************************************************************************
名称：地区导航
描述：地区导航功能，视角可以飞行到省，市，区

最后修改日期：2021-04-24
****************************************************************************/


<template>
    <win-tabs v-if="true" :initCSS="{ width: 300, height: 530, left: 500, top: 140 }" @close="close">
        <tab-pane label="地区导航">
            <areaNavigationContent></areaNavigationContent>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { TabPane, WinTabs } from '../../winTabs'
import { computed } from 'vue';
import areaNavigationContent from './areaNavigationContent.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { useEarthStore } from '@/stores/EarthStore';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

const show = computed(() => {
    return ceStore.comStatus('areaNavigation');
})
async function close() {
    const earth = await earthStore.getEarth()
    ceStore.setCesiumEarthComAction('areaNavigation', 2)
    earth.viewer3D.entities.removeById('areaPolygon');
}
</script>

<style lang="scss" scoped></style>
