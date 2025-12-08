<template>
    <div class="theme-green">
        <div v-show="show" class="vge-functionBar">
            <div class="vge-functionBar-btns">
                <div @click="changeSelected('toolBox')">
                    <img v-if="selected === 'toolBox'" :src="toolSelected" alt="">
                    <img v-else alt="" src="../assets/img/tool.png">
                    <span :style="{ color: selected === 'toolBox' ? baseColor : '#fff' }">工具</span>
                </div>
                <div @click="changeSelected('resourceTree')">
                    <img v-if="selected === 'resourceTree'" :src="layerSelected" alt="">
                    <img v-else alt="" src="../assets/img/layer.png">
                    <span :style="{ color: selected === 'resourceTree' ? baseColor : '#fff' }">数据</span>
                </div>
                <div @click="changeSelected('Echarts-MapV')">
                    <img v-if="selected === 'Echarts-MapV'" :src="echarts_mapvSelected" alt="">
                    <img v-else alt="" src="../assets/img/layer.png">
                    <span :style="{ color: selected === 'Echarts-MapV' ? baseColor : '#fff' }">可视化</span>
                </div>
                <div @click="changeSelected('spatialAnalyze')">
                    <img v-if="selected === 'spatialAnalyze'" :src="baseMapSelected" alt="">
                    <img v-else alt="" src="../assets/img/base-map.png">
                    <span :style="{ color: selected === 'baseMap' ? baseColor : '#fff' }">分析</span>
                </div>
            </div>
            <baseMap v-if="false"></baseMap>
            <toolBox></toolBox>
            <echarts_mapv></echarts_mapv>
        </div>
    </div>
</template>

<script lang="ts" setup>

import toolBox from './com/toolBox.vue';
import BaseMap from './com/baseMap.vue';

// import Echarts_mapv from './com/echartsMapvLayer/echarts_mapv.vue';

import bmsYellow from '../assets/img/base-map-selected-yellow.png';
import bmsGreen from '../assets/img/base-map-selected.png';
import toolYellow from '../assets/img/tool-selected-yellow.png';
import toolGreen from '../assets/img/tool-selected.png';
import layerYellow from '../assets/img/layer-selected-yellow.png';
import layerGreen from '../assets/img/layer-selected.png';
import { computed, onMounted, ref } from 'vue';

import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()

const selected = ref('layer')// baseMap/tool/layer

const show = computed(() => { return ceStore.comStatus('functionBar') })
const themeColor = computed(() => { return ceStore.themeColor; })
const baseMapSelected = computed(() => { return themeColor.value === 'yellow' ? bmsYellow : bmsGreen; })
const toolSelected = computed(() => { return themeColor.value === 'yellow' ? toolYellow : toolGreen; })
const layerSelected = computed(() => { return themeColor.value === 'yellow' ? layerYellow : layerGreen })
const echarts_mapvSelected = computed(() => { return themeColor.value === 'yellow' ? layerYellow : layerGreen })
const baseColor = computed(() => { return themeColor.value === 'yellow' ? '#F4BB42' : '#23D0C4' })



function changeSelected(val: string) {
    if (val !== 'toolBox') ceStore.setCesiumEarthComAction('toolBox', 2)
    if (val !== 'baseMap') ceStore.setCesiumEarthComAction('baseMap', 2)
    if (val !== 'resourceTree') ceStore.setCesiumEarthComAction('resourceTree', 2)
    if (val !== 'Echarts-MapV') ceStore.setCesiumEarthComAction('Echarts-MapV', 2)
    switch (val) {
        case 'toolBox': {
            ceStore.setCesiumEarthComAction('toolBox', 3)
        }
            break;
        case 'baseMap': {
            ceStore.setCesiumEarthComAction('baseMap', 3)
        }
            break;
        case 'resourceTree': {
            ceStore.setCesiumEarthComAction('resourceTree', 3)
        }
            break;
        case 'Echarts-MapV': {
            ceStore.setCesiumEarthComAction('Echarts-MapV', 3)
        }
            break;
        case 'spatialAnalyze': {
            ceStore.setCesiumEarthComAction('setCesiumEarthComAction', 3)
        }
    }

    selected.value = val;
}
function baseMapChange() {
    const mapsDom = document.querySelectorAll('.maps > div');
    mapsDom.forEach(item => {
        item.addEventListener('click', function () {
            const preActive = document.querySelector('.map-selected');
            preActive?.classList.remove('map-selected');
            item.classList.add('map-selected');
        });
    });
}
function toolBtnChange() {
    const toolBtnsDom = document.querySelectorAll('.tool-btn > div');
    toolBtnsDom.forEach(item => {
        item.addEventListener('click', function () {
            const preActive = document.querySelector('.tool-selected');
            preActive?.classList.remove('tool-selected');
            item.classList.add('tool-selected');
        });
    });
}
onMounted(() => {
    baseMapChange();
    toolBtnChange();
}) 
</script>

<style lang="scss" scoped>
@use "./../assets/css/common-theme.scss";
@use "./../assets/css/green-theme.scss";
@use "./../assets/css/yellow-theme.scss";
</style>
