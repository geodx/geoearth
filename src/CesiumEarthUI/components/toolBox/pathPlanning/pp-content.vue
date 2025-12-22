/****************************************************************************
名称：路径规划 的逻辑处理
最后修改日期：2022-08-19
****************************************************************************/

<template>
    <win-tabs :initCSS="{ width: 300, height: 280, left: 350, top: 380 }" @close="close">
        <tab-pane label="路径规划">
            <div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="5">
                            <label class="label-container">起点</label>
                        </el-col>
                        <el-col :span="14">
                            <input v-model="startingPoint" disabled min="0" style="float: none;width: 100%" />
                        </el-col>
                        <el-col :span="5">
                            <button class="btn btn-default btn-xs" style="float: right" type="button"
                                @click="takeStartingPoint">选点
                            </button>
                        </el-col>
                    </el-row>
                </div>

                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="5">
                            <label class="label-container">终点</label>
                        </el-col>
                        <el-col :span="14">
                            <input v-model="endPoint" disabled min="0" style="float: none;width: 100%" />
                        </el-col>
                        <el-col :span="5">
                            <button class="btn btn-default btn-xs" style="float: right" type="button"
                                @click="takeEndPoint">选点
                            </button>
                        </el-col>
                    </el-row>
                </div>

                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="5">
                            <label class="label-container">途经点</label>
                        </el-col>
                        <el-col :span="6">
                            <input v-model="passPointArr.length" disabled min="0" style="float: none;width: 100%" />
                        </el-col>
                        <el-col :span="13">
                            <div class="btn-group" style="float: right">
                                <button class="btn btn-default btn-xs" type="button" @click="takePassPoint">添加</button>
                                <button class="btn btn-default btn-xs" type="button" @click="clearPassPoint">重置</button>
                            </div>
                        </el-col>
                    </el-row>
                </div>

                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="5">
                            <label class="label-container">避让区</label>
                        </el-col>
                        <el-col :span="6">
                            <input v-model="avoidRanges.length" disabled min="0" style="float: none;width: 100%" />
                        </el-col>
                        <el-col :span="13">
                            <div class="btn-group" style="float: right">
                                <button class="btn btn-default btn-xs" type="button" @click="takeAvoidRange">添加</button>
                                <button class="btn btn-default btn-xs" type="button"
                                    @click="clearAvoidRanges">重置</button>
                            </div>
                        </el-col>
                    </el-row>
                </div>
                <div class="crlBtnGroup">
                    <button v-if="naviData" class="btn btn-primary btn-sm" @click="saveNaviData">导出</button>
                    <button class="btn btn-success btn-sm" @click="navigation">规划</button>
                    <button class="btn btn-warning btn-sm" @click="resetNavigation">清除</button>
                </div>
            </div>
            <div style="max-height: 500px;overflow: auto">
                <table v-if="paths.length > 0" class="roadTable">
                    <tr>
                        <td class="center" width="50">方案</td>
                        <td>推荐线路</td>
                    </tr>
                    <tr v-for="(p, i) in paths" @click="buildPathEntity(i)">
                        <td class="center">{{ p.id }}</td>
                        <td>
                            <p>{{ p.msg }}</p>
                        </td>
                    </tr>
                </table>
            </div>
        </tab-pane>
    </win-tabs>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { TabPane, WinTabs } from '../../winTabs'
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

const startingPoint = ref()
const endPoint = ref()
const passPointArr = ref([])
const avoidRanges = ref([])
const paths = ref([])
const naviData = ref()

let pathPlanning: any;
let routingServiceType: string;
onMounted(() => {
    initPathPlanning()
})
onUnmounted(() => {
    resetNavigation();
    pathPlanning.destroy();
})
async function initPathPlanning() {
    const earth = await earthStore.getEarth()
    const response = await fetch(new URL('/CesiumEarth/pathPlanning/init.json', import.meta.url))
    const config = await response.json()
    routingServiceType = config.routingServiceType;

    pathPlanning = new CesiumEarth.PathPlanning(earth.viewer3D, config.routingServiceType);
}
async function takeStartingPoint() {
    await pathPlanning.takeStartingPoint();
    startingPoint.value = pathPlanning.startingPoint.longitude + ',' + pathPlanning.startingPoint.latitude;
}
async function takeEndPoint() {
    await pathPlanning.takeEndPoint();
    endPoint.value = pathPlanning.endPoint.longitude + ',' + pathPlanning.endPoint.latitude;
}
async function takePassPoint() {
    await pathPlanning.takePassPoint();
    passPointArr.value = pathPlanning.passPointArr;
    console.log(passPointArr);
}
async function takeAvoidRange() {
    await pathPlanning.takeAvoidRange();
    console.log(pathPlanning.avoidRanges);
    avoidRanges.value = pathPlanning.avoidRanges;
}
async function clearPassPoint() {
    pathPlanning.clearPassPoint();
    passPointArr.value = [];
}
async function clearAvoidRanges() {
    pathPlanning.clearAvoidRanges();
    avoidRanges.value = [];
}
// 获取坐标采集工具
async function navigation() {
    if (startingPoint.value === '' || endPoint.value === '') {
        this.$message({ type: 'warning', message: '请选择起点和终点' });
        return;
    }
    let naviData = await pathPlanning.runNavigation();
    if (naviData) {
        this.naviData.value = naviData;
        await this.buildTable(naviData);
        await this.buildPathEntity(0);
    }
}
async function buildPathEntity(index) {
    await pathPlanning.buildPathEntity(index);
}
// 渲染表格
async function buildTable(naviData) {
    paths.value = [];
    if (routingServiceType === 'AMap') {
        naviData.paths.forEach((p, index) => {
            let pathStr = `${p.strategy}，全长：${(p.distance / 1000).toFixed(1)}公里。途径：`;
            p.steps.forEach(step => {
                pathStr += step.road ? (step.road + '、') : '';
            });
            paths.value.push({ id: index + 1, msg: pathStr });
        });
    } else {
        let index = 0;
        naviData.value.forEach(p => {
            let pathStr = `全长：${(p.distance / 1000).toFixed(1)}公里。`;
            p.instructions.forEach(instruction => {
                pathStr += instruction.text + `行驶${(instruction.distance / 1000).toFixed(1)}公里(预计${(instruction.time / 60000).toFixed(1)}分钟)。  `;
            });
            paths.value.push({ id: index + 1, msg: pathStr });
        });
    }
}
async function saveNaviData() {

    if (naviData.value) {
        saveAs(new Blob([JSON.stringify(this.naviData)], { type: 'text/plain;charset=utf-8' }), '导航数据.json');
    }
}
async function resetNavigation() {
    startingPoint.value = '';
    endPoint.value = '';
    passPointArr.value = [];
    avoidRanges.value = [];
    naviData.value = null;
    paths.value = [];
    pathPlanning.resetNavigation();
    pathPlanning.destroy();
    initPathPlanning();
}
function close() {
    ceStore.setCesiumEarthComAction('pathPlanning', 2)
}
</script>

<style lang="scss" scoped>
@import "@/assets/global/css/crlBtnGroup.scss";

label {
    color: #009b94;
}

input {
    color: #333;
}

.center {
    text-align: center
}

.roadTable {
    border: 1px solid;
    margin-top: 10px;
    color: white;
}
</style>
