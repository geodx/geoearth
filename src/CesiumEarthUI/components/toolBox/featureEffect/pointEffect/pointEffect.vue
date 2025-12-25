<template>
    <div>
        <ul>
            <li v-for="item in pointList" :key="item.id" class="liBox">
                <label class="label-container" style="color:white;">{{ item.name }}</label>
                <el-switch v-model="item.open" active-color="#13ce66" inactive-color="#929090" @change="change(item)">
                </el-switch>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">

import { domData, pointData } from './lib/data';
import bouncePoint from './lib/bouncePoint';
import divPoint from './lib/divPoint';
import simpleLabel from './lib/simpleLabel';
import erectLabelPoint from './lib/erectLabelPoint';
import hotSpot from './lib/hotSpot';
import gradientLabelPoint from './lib/gradientLabelPoint';
import hlsVideo from './lib/hlsVideo';
import primitiveLabelCol from './lib/primitiveLabelCol';
import liquidFill from './lib/liquidFill';
import floatMarker from './lib/floatMarker';
import dynamicDivLabel from './lib/dynamicDivLabel';
import { onMounted, onUnmounted, ref } from 'vue';
import type CesiumEarth from '@/lib/CesiumEarth/index';
import { useEarthStore } from '@/stores/EarthStore';
import { Cartesian3 } from 'cesium';
const earthStore = useEarthStore()

const pointList = ref<any[]>([])
let earth: CesiumEarth.Earth
onMounted(() => {
    setView();
    pointList.value = [
        {
            id: 0,
            name: '所有特效点',
            start: start,
            params: [domData.dom1, domData.dom1],
            destroy: ['point1', 'remove'],
            open: false
        },
        {
            id: 1,
            name: 'div文本点',
            start: divPoint,
            params: [domData.pos1, domData.dom1],
            destroy: ['point1', 'remove'],
            open: false
        },
        {
            id: 2,
            name: '简单标注点',
            start: simpleLabel,
            params: [domData.pos2, domData.dom2],
            destroy: ['point2', 'destroyWindow'],
            open: false
        },
        {
            id: 3,
            name: '竖立文本标注点',
            start: erectLabelPoint,
            params: [domData.pos3, domData.dom3],
            destroy: ['point3', 'remove'],
            open: false
        },
        {
            id: 4,
            name: '热点面板文本点',
            start: hotSpot,
            params: [domData.pos4, domData.dom4],
            destroy: ['point4', 'remove'],
            open: false
        },
        {
            id: 5,
            name: '简单渐变标注',
            start: gradientLabelPoint,
            params: [domData.pos5, domData.dom5],
            destroy: ['point5', 'remove'],
            open: false
        },
        {
            id: 6,
            name: 'hls视频窗口点',
            start: hlsVideo,
            params: [domData.pos6],
            destroy: ['hls', 'destroy'],
            open: false
        },
        {
            id: 7,
            name: '图标+文字',
            start: primitiveLabelCol,
            params: [domData.pos7],
            destroy: ['point7', 'remove'],
            open: false
        },
        {
            id: 8,
            name: '水球图',
            start: liquidFill,
            params: [domData.pos8, domData.dom8],
            destroy: ['point8', 'remove'],
            open: false
        },
        {
            id: 9,
            name: '浮动点',
            start: floatMarker,
            params: [domData.pos9],
            destroy: ['point9', 'remove'],
            open: false
        },
        {
            id: 10,
            name: '动态文本标记点',
            start: dynamicDivLabel,
            params: [domData.pos10],
            destroy: ['point10', 'remove'],
            open: false
        },
        {
            id: 11,
            name: '弹跳点',
            start: bouncePoint,
            params: [],
            destroy: [],
            open: false
        }
    ];
})
onUnmounted(() => {
    pointList.value[0].open = false;
    allChange(pointList.value[0]);
})
function change(item: any) {
    if (item.name == '所有特效点') {
        allChange(item);
        setView();
    } else {
        singleChange(item);
    }
}
function singleChange(item: any) {
    if (item.open) {
        start(item);
    } else {
        destroy(item);
    }
}
function allChange(item: any) {
    if (item.open) {
        for (let i = 1; i < pointList.value.length; i++) {
            if (!pointList.value[i].open) {
                pointList.value[i].open = true;
                start(pointList.value[i]);
            }
        }
    } else {
        for (let i = 1; i < pointList.value.length; i++) {
            if (pointList.value[i].open) {
                pointList.value[i].open = false;
                destroy(pointList.value[i]);
            }
        }
    }
}
function start(item: any) {
    if (item.name == '弹跳点') {
        item.start(pointData, earth.viewer3D);
    } else {
        item.start(...item.params, pointData);
    }
}
function destroy(item: any) {
    if (item.name == '弹跳点') {
        pointData.bMarkers.forEach(item => {
            item.remove();
        });
    } else {
        // pointData[item.destroy[0]][item.destroy[1]]();
    }
}
async function setView() {
    earth = await earthStore.getEarth()
    earth.viewer3D.camera.flyTo({
        'destination': new Cartesian3(-1715500.8002105777, 4993703.81513576, 3566670.885312287),
        'orientation': {
            'heading': 0.06817250192194901,
            'pitch': -0.4024205713517768,
            'roll': 6.283137603009188
        },
        duration: 1.5
    });
}



</script>

<style lang="scss" scoped>
.liBox {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: center;
}

::v-deep(.el-switch .el-switch__core) {
    width: 30px !important;
    height: 15px;
}

::v-deep(.el-switch .el-switch__core::after) {
    width: 14px;
    height: 14px;
    margin-top: -1px;
    margin-bottom: 2px;
}
</style>
