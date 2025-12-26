/****************************************************************************
名称：echarts_mapv 生成echarts和mapv图层,并带有销毁功能
最后修改日期：2022-04-20
****************************************************************************/

<template>
    <div v-if="false" class="base-map">
        <div class="tool-title">
            <div>
                <img alt="" src="./img/base-map.png">
                <span>Echarts-Mapv可视化支持
                </span>
            </div>
            <img alt="" class="close-btn" src="./img/close.png" @click="close">
        </div>
        <div class="tool-body">
            <div class="maps">
                <div v-for="item in layerList" :class="{ 'map-selected': selItem === item.name }"
                    @click="toggleActive(item.name)">
                    <img :src="item.iconSrc" alt="">
                    <div>{{ item.name }}</div>
                </div>
            </div>
            <div>
                <button class="btn btn-warning btn-sm" style="margin-left: 260px; margin-bottom:5px;margin-top:5px;"
                    type="button" @click="clearAlllayer">清空Layer
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import createMigrate1 from './lib/EchartsLayer/migrate1';
import createMigrate2 from './lib/EchartsLayer/migrate2';
import createMigrate3 from './lib/EchartsLayer/migrate3';
import createOutflow from './lib/EchartsLayer/outflow';
import createInflow from './lib/EchartsLayer/inflow';
import createScatter from './lib/EchartsLayer/scatter';
import createMigrate from './lib/MapVLayer/migrate';
import createBigmigrate from './lib/MapVLayer/big_migrate';
import createHeatmap from './lib/MapVLayer/heat_map';
import createStrongboundary from './lib/MapVLayer/strong_boundary';
import createBeehive from './lib/MapVLayer/beehive';
import createSquaregraph from './lib/MapVLayer/square_graph';
import { computed, ref } from 'vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { Cartesian3 } from 'cesium';
import { useEarthStore } from '@/stores/EarthStore';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

const selItem = ref('')
const layerList = ref([
    { name: '迁徙图1', iconSrc: './app/vge/echartsMapvLayerDemo/migrate1.png' },
    { name: '迁徙图2', iconSrc: './app/vge/echartsMapvLayerDemo/migrate2.png' },
    { name: '迁徙图3', iconSrc: './app/vge/echartsMapvLayerDemo/migrate3.png' },
    { name: '流出线', iconSrc: './app/vge/echartsMapvLayerDemo/outflow.png' },
    { name: '流入线', iconSrc: './app/vge/echartsMapvLayerDemo/inflow.png' },
    { name: '散点图', iconSrc: './app/vge/echartsMapvLayerDemo/scatter.png' },
    { name: '迁徙图', iconSrc: './app/vge/echartsMapvLayerDemo/migrate.png' },
    { name: '大迁徙图', iconSrc: './app/vge/echartsMapvLayerDemo/big_migrate.png' },
    // {name: '强力图', iconSrc: './app/vge/echartsMapvLayerDemo/heat_map.png'},
    { name: '强边界图', iconSrc: './app/vge/echartsMapvLayerDemo/strong_boundary.png' },
    { name: '蜂巢图', iconSrc: './app/vge/echartsMapvLayerDemo/beehive.png' },
    { name: '方格图', iconSrc: './app/vge/echartsMapvLayerDemo/square_graph.png' }
])

let echarts: any;
let mapv: any;

const show = computed(() => {
    return ceStore.comStatus('Echarts-MapV');
})

//销毁图层
function clearLayer() {
    if (echarts) {
        echarts.remove();
        echarts = null;
    }
    if (mapv) {
        mapv.map((layer: any) => {
            layer.destroy();
        });
        mapv = null;
    }
}

//设置视角
function setView() {
    earthStore.getEarth().then(earth => {
        earth.viewer3D.camera.setView({
            destination: Cartesian3.fromDegrees(117.16, 32.71, 15000000.0)
        });
    })
}
function close() {
    ceStore.setCesiumEarthComAction('Echarts-MapV', 2)
}
function toggleActive(echartsItem: string) {
    clearLayer();
    setView();
    switch (echartsItem) {
        case '迁徙图1':
            echarts = createMigrate1();
            break;
        case '迁徙图2':
            echarts = createMigrate2();
            break;
        case '迁徙图3':
            echarts = createMigrate3();
            break;
        case '流出线':
            echarts = createOutflow();
            break;
        case '流入线':
            echarts = createInflow();
            break;
        case '散点图':
            echarts = createScatter();
            break;
        case '迁徙图':
            mapv = createMigrate();
            break;
        case '大迁徙图':
            mapv = createBigmigrate();
            break;
        case '强力图':
            mapv = createHeatmap();
            break;
        case '强边界图':
            mapv = createStrongboundary();
            break;
        case '蜂巢图':
            mapv = createBeehive();
            break;
        case '方格图':
            mapv = createSquaregraph();
            break;
    }
    selItem.value = echartsItem;
}
function clearAlllayer() {
    clearLayer();
    selItem.value = '';
}

</script>

<style lang='scss' scoped>
.base-map {
    position: absolute;
    z-index: 99;
    top: 60px;
    left: 20px;
    width: 350px;

    .tool-body {
        padding: 5px;

        .maps {
            display: flex;
            flex-wrap: wrap;

            &>div {
                cursor: pointer;
                margin: 0 2.5px;

                img {
                    height: 70px;
                    width: 80px;
                    border: 1px solid transparent;
                }

                div {
                    font-size: 12px;
                    font-weight: normal;
                    color: #FFFFFF;
                    text-align: center;
                }
            }
        }

        .show-terrain {
            margin-top: 1vh;
            margin-left: 10px;
        }
    }
}

.tool-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    font-size: 16px;
    font-weight: normal;
    color: #FFFFFF;
    height: 35px;
    line-height: 35px;
    border-bottom: 1px solid rgba(185, 197, 185, 0.2);

    img:first-child {
        margin-right: 0.5vw;
    }

    .close-btn {
        text-align: right;
        width: 20px;
        height: 20px;
        color: #fff;
        cursor: pointer;
    }
}
</style>
