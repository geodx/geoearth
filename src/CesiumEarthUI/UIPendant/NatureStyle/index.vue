/****************************************************************************
名称：主线版本，大屏界面
最后修改日期：2022-05-27
****************************************************************************/

<template>
    <div :class="{ 'theme-green': themeColor === 'green', 'theme-yellow': themeColor === 'yellow' }">
        <tileHeader v-if="tileHeaderShow"></tileHeader>
        <div v-show="infoWindowsShow" class="cesium-infoWindows">
            <weather></weather>
            <disaster></disaster>
            <earlyWarning></earlyWarning>
        </div>
        <functionBar></functionBar>
    </div>
</template>


<script lang="ts" setup>
import './assets/icon/iconfont.js';
import tileHeader from './titleHeader/titleHeader.vue';
import Weather from './leftPanel/weather.vue';
import EarlyWarning from './leftPanel/earlyWarning.vue';
import Disaster from './leftPanel/disaster.vue';
import FunctionBar from './functionBar/functionBar.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore.js';
import { onMounted, computed } from 'vue';

const ceStore = useCesiumEarthStore()
onMounted(() => {
    if (ceStore.demoModel) {
        document.addEventListener("keydown", keydownEvent)
    }
})
const infoWindowsShow = computed(() => {
    // return    ceStore.comStatus('infoWindows')
    return true
})
const tileHeaderShow = computed(() => {
    return ceStore.comStatus('titleHeader')
})
const themeColor = computed(() => {
    return ceStore.themeColor;
})
// 演示模式下，按下 Enter 键，自动主题颜色
function keydownEvent(e: KeyboardEvent) {
    if (e.key === "Enter") {
        ceStore.setLegendCurrent(themeColor.value === 'yellow' ? 'green' : 'yellow')
    }
}

</script>

<style lang='scss' scoped>
@use "./assets/css/common-theme.scss";
@use "./assets/css/green-theme.scss";
@use "./assets/css/yellow-theme.scss";
</style>


<style lang="scss" scoped>
img,
span {
    vertical-align: middle;
}

.icon {
    width: 1em;
    height: 1em;
    vertical-align: -0.15em;
    fill: currentColor;
    overflow: hidden;
}
</style>
