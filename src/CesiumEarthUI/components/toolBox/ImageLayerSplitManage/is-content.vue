/****************************************************************************
名称：卷帘对比
最后修改日期：2021-12-2
****************************************************************************/
<template>

    <div id="ImageLayerSplitMana" class="main-menu-tool-warp">
        <div style="padding-bottom: 10px;position: relative">
            数据分组
            <el-select v-model="selGroup" placeholder="请选择数据分组" size="small" style="width: 160px">
                <el-option v-for="item in groupList" :key="item" :label="item" :value="item">
                </el-option>
            </el-select>
            <el-icon class="image-ctr" @click="exit">
                <Close />
            </el-icon>
            <el-icon class="image-ctr" @click="closeSplit">
                <Refresh />
            </el-icon>

        </div>
        <div>
            左侧图层
            <el-select v-model="leftLayer" placeholder="请选择左侧图层" size="small" style="width: 160px"
                @change="setLeftLayer">
                <el-option v-for="item in layers" :key="item.name" :label="item.name" :value="item.name">
                </el-option>
            </el-select>
            右侧图层
            <el-select v-model="rightLayer" placeholder="请选择右侧图层" size="small" style="width: 160px"
                @change="setRightLayer">
                <el-option v-for="item in layers" :key="item.name" :label="item.name" :value="item.name">
                </el-option>
            </el-select>
        </div>
    </div>

</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue';
import ImageryXYZ_3857_Provider from './lib/ImageryXYZ_3857_Provider';
import SingleTileImagery from './lib/SingleTileImagery';
import { Close, Refresh } from '@element-plus/icons-vue';
import CesiumEarth from '@/lib/CesiumEarth';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { useEarthStore } from '@/stores/EarthStore';
import { SplitDirection } from 'cesium';

const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()
const selGroup = ref()
const layers = ref([])
const leftLayer = ref()
const rightLayer = ref()

let layersData: any = []
const layerMap = new Map()

let splitControlL: any = null;
let splitControlR: any = null;
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    await getSHBLayers();
})
onUnmounted(() => {
    closeSplit()
})
watch(() => selGroup.value, (newValue, oldValue) => {
    closeSplit()
    loadAllLayer()
})

const groupList = computed(() => {
    return layersData.map((item: any) => item.group)
})
// 获取图层数据
async function getSHBLayers() {
    const response = await fetch(new URL('/CesiumEarth/ImageLayerTimeLine/init.json', import.meta.url))
    const data = await response.json()
    console.log(data);
    layersData = data;
    if (layersData.length > 0) {
        selGroup.value = layersData[0].group;
    }
}
function loadAllLayer() {
    let group = layersData.find((item: any) => item.group === selGroup.value);
    let position = group.position;
    CesiumEarth.SceneUtils.viewerFlyToLonLat(position.lon, position.lat, position.height);
    layers.value = group.layers || [];

    for (let i = 0; i < layers.value.length; i++) {
        const layer: any = layers.value[i];
        if (!layer) continue
        if (layer.properties.scheme === 'layer-xyz-3857') {
            const provider = ImageryXYZ_3857_Provider(layer.properties.url as string, layer);
            layerMap.set(layer.name, provider);
        } else if (layer.properties.scheme === 'layer-singleTileImagery') {
            const imagery = SingleTileImagery(layer.properties.url, layer);
            layerMap.set(layer.name, imagery);
        }
    }
}

function closeSplit() {
    setLeftLayer(undefined);
    setRightLayer(undefined);
}

function setLeftLayer(layerName: string | undefined) {
    ceStore.resetLegend()
    if (splitControlL) {
        splitControlL.destroy();
        splitControlL = undefined;
    }
    if (layerName) {
        let layerL = layerMap.get(layerName);

        let group = layersData.find((item: any) => item.group === selGroup.value);
        if (group.legend) {
            ceStore.setLegendCurrent({ title: group.group, list: [], img: group.legend })
        }

        splitControlL = new CesiumEarth.ImageLayerSplit(earth.viewer3D, layerL, SplitDirection.LEFT);
    } else {
        leftLayer.value = undefined;
    }
}
function setRightLayer(layerName: string | undefined) {
    if (splitControlR) {
        splitControlR.destroy();
        splitControlR = undefined;
    }
    if (layerName) {
        let layerR = layerMap.get(layerName);

        let group = layersData.find((item: any) => item.group === selGroup.value);
        if (group.legend) {
            ceStore.setLegendCurrent({ title: group.group, list: [], img: group.legend })
        }

        splitControlR = new CesiumEarth.ImageLayerSplit(earth.viewer3D, layerR, SplitDirection.RIGHT);
    } else {
        rightLayer.value = undefined;
    }
}

// 退出卷帘分析
function exit() {
    closeSplit();
    layers.value = [];
    layerMap.clear();
    selGroup.value = '';
    ceStore.setCesiumEarthComAction('ImageLayerSplitMana', 2)
}

</script>

<style lang="scss" scoped>
#ImageLayerSplitMana {
    position: absolute;
    background-color: rgba(33, 45, 33, 0.8);
    width: 461px;
    top: 110px;
    left: 515px;
    right: 0;
    color: #00E3FF;
    font-size: 14px;
    font-weight: 500;
    padding: 8px;
    border-radius: 3px;
}

#ImageLayerSplitMana i {
    line-height: 28px;
    font-size: 22px;
    padding-left: 5px;
}

.image-ctr {
    color: white;
    float: right
}

.image-ctr:hover {
    color: #00E3FF;
}
</style>
