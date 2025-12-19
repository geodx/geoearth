/****************************************************************************
名称：天空盒的逻辑处理
作者：冯功耀
最后修改日期：2022-04-20
****************************************************************************/

<template>
    <win-tabs :initCSS="{ width: 310, height: 190, left: 400, top: 120 }" @close="close">
        <tab-pane label="天空盒">
            <div>
                <el-row class="form-item">
                    <el-col :span="8">
                        <label class="label-container">远景天空盒</label>
                    </el-col>
                    <el-col :span="16">
                        <el-select v-model="farSkyBox" clearable placeholder="请选择" size="small" @change="setFarSkyBox">
                            <el-option v-for="item in farSkyBoxInfoList" :key="item.index" :label="item.name"
                                :value="item.index" />
                        </el-select>
                    </el-col>
                </el-row>

                <el-row class="form-item">
                    <el-col :span="8">
                        <label class="label-container">地面天空盒</label>
                    </el-col>
                    <el-col :span="16">
                        <el-select v-model="groundSkyBox" clearable placeholder="请选择" size="small"
                            @change="setGroundSkyBox">
                            <el-option v-for="item in groundSkyBoxInfoList" :key="item.index" :label="item.name"
                                :value="item.index" />
                        </el-select>
                    </el-col>
                </el-row>

                <div style="text-align:center;padding-top:10px">
                    <button class="btn btn-primary btn-sm" style="margin-right:5px;margin-left:80px"
                        @click="flyToFar">远景</button>
                    <button class="btn btn-success btn-sm" style="margin-right:5px" @click="flyToGround">近景</button>
                    <button class="btn btn-warning btn-sm" style="margin-right:5px" @click="reset">重置</button>
                </div>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { TabPane, WinTabs } from '../../winTabs'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { useEarthStore } from '@/stores/EarthStore';
import * as Cesium from 'cesium'
import CesiumEarth from '@/lib/CesiumEarth';
import type { Earth } from '@/lib/CesiumEarth/ts/Earth';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

type SkyBoxInfoItem = { index: number, name: string }
const farSkyBox = ref<number>(0)
const farSkyBoxInfoList = ref<SkyBoxInfoItem[]>([])
const groundSkyBox = ref<number>(0)
const groundSkyBoxInfoList = ref<SkyBoxInfoItem[]>([])

const farSkyBoxList: any[] = []
const groundSkyBoxList: any[] = []

let SkyBox: CesiumEarth.SkyBoxOnGround
let earth: Earth
async function loadConfig() {
    const response = await fetch(new URL('/CesiumEarth/skybox/skybox.json', import.meta.url))
    const skybox = await response.json()
    const baseUrl = skybox.baseUrl

    farSkyBoxInfoList.value.length = 0
    farSkyBoxList.length = 0
    for (let i = 0; i < skybox.farSkyBoxList.length; i++) {
        farSkyBoxInfoList.value.push({ index: i, name: skybox.farSkyBoxList[i].name })
        farSkyBoxList.push({
            sources: {
                positiveX: baseUrl + skybox.farSkyBoxList[i].sources.positiveX,
                negativeX: baseUrl + skybox.farSkyBoxList[i].sources.negativeX,
                positiveY: baseUrl + skybox.farSkyBoxList[i].sources.positiveY,
                negativeY: baseUrl + skybox.farSkyBoxList[i].sources.negativeY,
                positiveZ: baseUrl + skybox.farSkyBoxList[i].sources.positiveZ,
                negativeZ: baseUrl + skybox.farSkyBoxList[i].sources.negativeZ
            }
        })
    }
    SkyBox.setFarSkyBox(farSkyBoxList[0])


    groundSkyBoxInfoList.value.length = 0
    groundSkyBoxList.length = 0
    for (let i = 0; i < skybox.groundSkyBoxList.length; i++) {
        groundSkyBoxInfoList.value.push({ index: i, name: skybox.groundSkyBoxList[i].name })
        groundSkyBoxList.push({
            sources: {
                positiveX: baseUrl + skybox.groundSkyBoxList[i].sources.positiveX,
                negativeX: baseUrl + skybox.groundSkyBoxList[i].sources.negativeX,
                positiveY: baseUrl + skybox.groundSkyBoxList[i].sources.positiveY,
                negativeY: baseUrl + skybox.groundSkyBoxList[i].sources.negativeY,
                positiveZ: baseUrl + skybox.groundSkyBoxList[i].sources.positiveZ,
                negativeZ: baseUrl + skybox.groundSkyBoxList[i].sources.negativeZ
            }
        })
    }
    SkyBox.setGroundSkyBox(groundSkyBoxList[0])
}

function flyToGround() {
    earth.viewer3D.camera.flyTo({
        destination: new Cesium.Cartesian3(-2895596.962457116, 4717490.945820842, 3158425.3777735666),
        orientation: {
            heading: 3.8736780571268605,
            pitch: -0.13964038346926966,
            roll: 6.283183317671659
        }
    })
}

function flyToFar() {
    earth.viewer3D.camera.flyHome()
}

function setFarSkyBox(index: number = 0) {
    SkyBox.setFarSkyBox(farSkyBoxList[index])
}

function setGroundSkyBox(index: number = 0) {
    SkyBox.setGroundSkyBox(groundSkyBoxList[index])
}

function reset() {
    farSkyBox.value = 0
    groundSkyBox.value = 0
    loadConfig()

}

function close() {
    ceStore.setCesiumEarthComAction('skyBoxTool', 2)
}

onMounted(async () => {
    earth = await earthStore.getEarth()
    SkyBox = new CesiumEarth.SkyBoxOnGround(earth.viewer3D)
    await loadConfig()
})

onUnmounted(() => {
    SkyBox?.destroy?.()
})
</script>

<style lang="scss" scoped>
label {
    color: #009b94;
}

.form-item {
    margin-bottom: 5px;
}
</style>
