/****************************************************************************
名称：图层时间轴组件
最后修改日期：2022-03-31
****************************************************************************/

<template>
    <div id="ImageSliderMana">
        <div id="ImageSliderMana-select">
            <el-select v-model="selGroup" placeholder="请选择数据分组" size="small" style="top: -14px">
                <el-option v-for="item in groupList" :key="item" :label="item" :value="item">
                </el-option>
            </el-select>
        </div>
        <el-slider v-model="layerIndex" :format-tooltip="formatLayerTip"
            :max="layersInfo.length - 1 < 1 ? 1 : layersInfo.length - 1" @change="setLayer">
        </el-slider>
    </div>
</template>

<script lang="ts" setup>

import CesiumEarth from '@/lib/CesiumEarth/index.js';
import ImageryXYZ_3857_Provider from '../ImageLayerSplitManage/lib/ImageryXYZ_3857_Provider.js';
import SingleTileImagery from '../ImageLayerSplitManage/lib/SingleTileImagery.js';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore.js';
import { useEarthStore } from '@/stores/EarthStore.js';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

const selGroup = ref()
const layersInfo = ref([])
const layerIndex = ref(0)

let layers: any = []
let layersData = ref<any[]>([])
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    CesiumEarth.SceneUtils.viewerFlyToLonLat(earth.viewer3D, 117.316034, 42.411409, 55150);
    await getSHBLayers();
})
onUnmounted(() => {
    removeAll();
})
watch(() => selGroup.value, (newValue, oldValue) => {
    initImageLayerTimeLine()
})
const groupList = computed(() => {
    return layersData.value.map((item: any) => item.group)
})
async function getSHBLayers() {
    const response = await fetch(new URL('/CesiumEarth/ImageLayerTimeLine/init.json', import.meta.url))
    layersData.value = await response.json()
    console.log(layersData);

    if (layersData.value.length > 0) {
        selGroup.value = layersData.value[0].group;
    }
}

// 初始化图层管理器
function initImageLayerTimeLine() {
    const group = layersData.value.find((item: any) => item.group === selGroup.value);

    const position = group.position;
    CesiumEarth.SceneUtils.viewerFlyToLonLat(earth.viewer3D, position.lon, position.lat, position.height);

    layersInfo.value = group.layers || [];
    removeAll();

    layersInfo.value.forEach((item: any) => {
        if (item) {
            const imageryProvider = creatLayer(item)
            if (!imageryProvider) return
            const layer = earth.viewer3D.imageryLayers.addImageryProvider(imageryProvider);
            layer.show = false;
            layers.push({ name: item.name, time: item.time, layer: layer });
        }
    });

    setLayer(0);
}
function formatLayerTip() {
    const layerItem: any = layersInfo.value[layerIndex.value || 0] || {};
    return layerItem.time;
}
// 创建图层
function creatLayer(layerItem: any) {
    if (layerItem.properties.scheme === 'layer-xyz-3857') {
        return ImageryXYZ_3857_Provider(layerItem.properties.url, layerItem);
    } else if (layerItem.properties.scheme === 'layer-singleTileImagery') {
        return SingleTileImagery(layerItem.properties.url, layerItem);
    }
}
// 设置当前图层
function setLayer(layerIndex: number | undefined) {
    ceStore.resetLegend()
    layers.forEach((i: any, index: number) => {
        i.layer.show = index === layerIndex;
    });
    const group = layersData.value.find((item: any) => item.group === selGroup);
    if (group?.legend) {
        ceStore.setLegendCurrent({ title: group.group, list: [], img: group.legend })
    }
}
function removeAll() {
    for (let i = 0; i < layers.length; i++) {
        const res = earth.viewer3D.imageryLayers.remove(layers[i].layer);
    }
    setLayer(undefined);
    layers = [];
    ceStore.resetLegend()
}
</script>

<style lang="scss" scoped>
#ImageSliderMana {
    display: flex;
    position: fixed;
    bottom: 40px;
    width: 100%;
    text-align: center;
    justify-content: center;
    align-items: center;

    #ImageSliderMana-select {}

    :deep(.el-slider) {
        width: 550px;
        display: inline-block;
        padding-left: 40px;
    }
}
</style>
