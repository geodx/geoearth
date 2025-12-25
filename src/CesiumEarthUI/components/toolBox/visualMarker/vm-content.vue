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
                    <div class="sm-function-module-sub-section" style="margin-bottom: 5px">
                        <el-row>
                            <el-col :span="3">
                                <label class="label-container" style="line-height: 28px;">名称</label>
                            </el-col>
                            <el-col :span="11">
                                <input v-model="name" class="sm-input-long" min="0"
                                    style="float: none;width: 100%;height:30px" type="text" />
                            </el-col>
                            <el-col :span="10" style="text-align: center">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-primary btn-sm" style="margin-right: 5px" type="button"
                                        @click="takeVisualMarker">添加
                                    </button>
                                    <button v-if="canImport" class="btn btn-success btn-sm" style="margin-right: 5px"
                                        type="button" @click="importMarkers">导入
                                    </button>
                                    <button v-if="canExport" class="btn btn-warning btn-sm" type="button"
                                        @click="exportMarkers">导出
                                    </button>
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
                                        <label class="label-container">名称: </label>{{ mark.name }}
                                    </div>
                                    <div style="margin-top: 5px">
                                        <label class="label-container">位置:</label>
                                        {{
                                            Cartesian3_to_WGS84(mark.cameraView.destination).lng
                                        }},{{ Cartesian3_to_WGS84(mark.cameraView.destination).lat }}
                                    </div>
                                    <div style="margin-top: 5px">
                                        <label class="label-container">高度:</label>{{
                                            Cartesian3_to_WGS84(mark.cameraView.destination).alt
                                        }}
                                        米
                                    </div>
                                    <div style="margin-top: 5px">
                                        <button class="btn btn-danger btn-sm" style="float: left" type="button"
                                            @click="removeMark(mark.id)">删除
                                        </button>
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

import bookMarkManagerData from './lib/data';
import defaultVM from './default.json';
import { ref, onMounted, computed } from 'vue';
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { Cartesian3, Cartographic, Math } from 'cesium';
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()
const tip = ref('请输入标签名称')
const name = ref('未命名书签')
const markers = ref<any[]>([])
const imgWidth = ref(0)
let container = null;
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    container = document.getElementById('markerContent');
    imgWidth.value = 172;
    bookMarkManagerData.bookMarkManager = new CesiumEarth.BookmarkManager(earth.viewer3D, markers);
    for (let i = 0; i < defaultVM.markList.length; i++) {
        markers.value.push(defaultVM.markList[i]);
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
    return imgWidth;
})
const imageHeight = computed(() => {
    return imageWidth * 0.75;
})
function takeVisualMarker() {
    container = document.getElementById('markerContent');
    let w = container.offsetWidth - 8;
    let h = w * 0.75;
    w = w * 0.5;
    h = h * 0.5;
    imgWidth.value = w;
    bookMarkManagerData.bookMarkManager.createBookmark(this.$data.name, h, w).then(res => {
        bookMarkManagerData.bookMarkManager.add(res);
    });
} function
    removeMark(bookMarkId) {
    bookMarkManagerData.bookMarkManager.removeBookmark(bookMarkId);
    function
        importMarkers() {
        bookMarkManagerData.bookMarkManager.loadMark();
        function
            exportMarkers() {
            bookMarkManagerData.bookMarkManager.saveMark('marks');
            function
                flyTo(cameraView) {
                earth.viewer3D.scene.camera.flyTo(cameraView);
                function
                    close() {
                    ceStore.setCesiumEarthComAction('visualMarker', 2)
                    function
                        Cartesian3_to_WGS84(point) {
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

.center {
    text-align: center
}

.roadTable {
    border: 1px solid;
    margin-top: 10px;
    color: white;
}

.footer {
    position: absolute;
    bottom: 20px;
    width: 100%;
}

#container {
    max-height: 450px;
    overflow-y: auto;
    overflow-x: hidden;
}

.marker {
    margin-top: 5px;
}
</style>
