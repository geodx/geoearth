/****************************************************************************
名称：视觉书签项
最后修改日期：2022-04-28
****************************************************************************/
<template>
    <win-tabs :initCSS="{ width: 440, height: 560, left: 580, top: 330 }" @close="close">
        <tab-pane label="视觉标签">
            <div>
                <input id="choseFile" style="display:none" type="file" />
                <div>
                    <div style="margin-bottom: 5px">
                        <el-row>
                            <el-col :span="3">
                                <label style="line-height: 28px;">名称</label>
                            </el-col>
                            <el-col :span="10">
                                <input id="name" v-model="name" min="0" style="float: none;width: 100%;height:22px"
                                    type="text" />
                            </el-col>
                            <el-col :span="11" style="text-align: right">
                                <div class="btn-group" role="group">
                                    <el-button size="small" type="primary" @click="takeVisualMarker">添加</el-button>
                                    <el-button size="small" type="success" @click="importMarkers">导入</el-button>
                                    <el-button size="small" type="warning" @click="exportMarkers">导出</el-button>
                                </div>
                            </el-col>
                        </el-row>
                    </div>
                </div>
                <div id="container">
                    <div id="markerContent">
                        <div v-for="mark in markers" class="mark" style="margin-bottom: 5px">
                            <el-row>

                                <el-col :span="12">
                                    <img :style="{ width: imageWidth + 'px' }" v-bind:src="mark.img"
                                        @click="flyTo(mark.cameraView)" />

                                </el-col>
                                <el-col :span="10" style="margin-left: 10px">

                                    <div style="margin-top: 5px">
                                        <label>名称: </label>{{ mark.name }}
                                    </div>
                                    <div style="margin-top: 5px">
                                        <label>位置:</label>
                                        {{ Cartesian3_to_WGS84(mark.cameraView.destination).lng }},
                                        {{ Cartesian3_to_WGS84(mark.cameraView.destination).lat }}
                                    </div>
                                    <div style="margin-top: 5px">
                                        <label>高度:</label>
                                        {{ Cartesian3_to_WGS84(mark.cameraView.destination).alt }}
                                        米
                                    </div>
                                    <div style="margin-top: 5px">
                                        <el-button size="small" type="danger" style="float: left"
                                            @click="removeMark(mark.id)">删除</el-button>
                                    </div>
                                </el-col>
                            </el-row>
                        </div>
                    </div>
                </div>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { TabPane, WinTabs } from '../../winTabs'

import defaultVM from './default.json';
import { ref, onMounted, computed } from 'vue';
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { Cartesian3, Cartographic, Math } from 'cesium';
import type { BookmarkType } from '@/lib/CesiumEarth/ts/Utils/CameraView/BookmarkManager';
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()
const tip = ref('请输入标签名称')
const name = ref('未命名书签')
const markers = ref<BookmarkType[]>([])
const imgWidth = ref(0)
let container: HTMLElement | null;
let earth: CesiumEarth.Earth
let bookMarkManager: CesiumEarth.BookmarkManager;
onMounted(async () => {
    earth = await earthStore.getEarth()
    container = document.getElementById('markerContent');
    imgWidth.value = 172;
    bookMarkManager = new CesiumEarth.BookmarkManager(earth.viewer3D);
    for (let i = 0; i < defaultVM.markList.length; i++) {
        markers.value.push(defaultVM.markList[i] as BookmarkType);
    }
})
const canExport = computed(() => {
    return markers.value.length > 0;
})
const canImport = computed(() => {
    return true;
})
const imageWidth = computed(() => {
    //container = document.getElementById("markerContent");
    //let w = container.offsetWidth - 8;
    //return w*0.5;
    return imgWidth.value;
})
const imageHeight = computed(() => {
    return imageWidth.value * 0.75;
})
function takeVisualMarker() {
    container = document.getElementById('markerContent');
    let w = container?.offsetWidth || 0 - 8;
    let h = w * 0.75;
    w = w * 0.5;
    h = h * 0.5;
    imgWidth.value = w;
    bookMarkManager.createBookmark(name.value, h, w).then(res => {
        markers.value.push(res);
    });
}

function removeMark(bookMarkId: string) {
    const index = markers.value.findIndex(v => v.id === bookMarkId);
    markers.value.splice(index, 1)
}
function importMarkers() {
    bookMarkManager.loadMark((json: BookmarkType[]) => {
        json.forEach(v => {
            let has = markers.value.findIndex(m => m.id === v.id);
            if (has === -1) {
                markers.value.push(v)
            }
        })
    });
}
function exportMarkers() {
    bookMarkManager.saveMark('marks', markers.value);
}
function flyTo(cameraView: any) {
    earth.viewer3D.scene.camera.flyTo(cameraView);
}
function close() {
    ceStore.setCesiumEarthComAction('visualMarker', 2)
}
function Cartesian3_to_WGS84(point: any) {
    let cartesian33 = new Cartesian3(point.x, point.y, point.z);
    let cartographic = Cartographic.fromCartesian(cartesian33);
    let lat = Math.toDegrees(cartographic.latitude).toFixed(3);
    let lng = Math.toDegrees(cartographic.longitude).toFixed(3);
    let alt = cartographic.height.toFixed(3);
    return { lng: lng, lat: lat, alt: alt };
}


</script>

<style lang="scss" scoped>
label {
    color: #009b94;
}


#container {
    max-height: 450px;
    overflow-y: auto;
    overflow-x: hidden;
}

.mark {
    padding: .2em;
    background-color: #fcf8e3;
}
</style>
