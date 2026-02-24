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
                            <el-input v-model="startingPoint" readonly />
                        </el-col>
                        <el-col :span="5" style="display:flex;align-items:center;">
                            <el-button @click="takeStartingPoint" type="default" size="small"
                                style="margin-left:auto;height: 22px;padding: 1px 5px; ">选点</el-button>
                        </el-col>
                    </el-row>
                </div>

                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="5">
                            <label class="label-container">终点</label>
                        </el-col>
                        <el-col :span="14">
                            <el-input v-model="endPoint" readonly />
                        </el-col>
                        <el-col :span="5" style="display:flex;align-items:center;">
                            <el-button @click="takeEndPoint" type="default" size="small"
                                style="margin-left:auto;height: 22px;padding: 1px 5px; ">选点</el-button>

                        </el-col>
                    </el-row>
                </div>

                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="5">
                            <label class="label-container">途经点</label>
                        </el-col>
                        <el-col :span="6">
                            <el-input v-model="passPointArr.length" readonly />
                        </el-col>
                        <el-col :span="13">
                            <div class="btn-group" style="float: right">
                                <el-button @click="takePassPoint" type="default" size="small"
                                    style="margin-left:auto;height: 22px;padding: 1px 5px; ">添加</el-button>
                                <el-button @click="clearPassPoint" type="default" size="small"
                                    style="margin-left:auto;height: 22px;padding: 1px 5px; ">重置</el-button>
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
                            <el-input v-model="avoidRanges.length" readonly />
                        </el-col>
                        <el-col :span="13">
                            <div class="btn-group" style="float: right">
                                <el-button @click="takeAvoidRange" type="default" size="small"
                                    style="margin-left:auto;height: 22px;padding: 1px 5px; ">添加</el-button>
                                <el-button @click="clearAvoidRanges" type="default" size="small"
                                    style="margin-left:auto;height: 22px;padding: 1px 5px; ">重置</el-button>
                            </div>
                        </el-col>
                    </el-row>
                </div>
                <div style="text-align: center;padding-top: 10px">
                    <el-button-group size="small">
                        <el-button v-if="naviData" @click="saveNaviData" type="primary">点</el-button>
                        <el-button @click="navigation" type="success">规划</el-button>
                        <el-button @click="resetNavigation" type="warning">清除</el-button>
                    </el-button-group>
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
import { ElMessage } from 'element-plus';
import type { WorldDegree } from '@/lib/CesiumEarth/ts/cesium.earth';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

const startingPoint = ref();
const endPoint = ref()
const passPointArr = ref<WorldDegree[]>([])
const avoidRanges = ref<WorldDegree[][]>([])
const paths = ref<any[]>([])
const naviData = ref()

let pathPlanning: CesiumEarth.PathPlanning;
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
}
async function takeAvoidRange() {
    await pathPlanning.takeAvoidRange();
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
        ElMessage({ type: 'warning', message: '请选择起点和终点' });
        return;
    }
    const navi = await pathPlanning.runNavigation();
    if (navi) {
        naviData.value = navi;
        await buildTable(navi);
        await buildPathEntity(0);
    }
}
async function buildPathEntity(index: number) {
    await pathPlanning.buildPathEntity(index);
}
// 渲染表格
async function buildTable(naviData: any) {
    paths.value = [];
    if (routingServiceType === 'AMap') {
        naviData.paths.forEach((p: any, index: number) => {
            let pathStr = `${p.strategy}，全长：${(p.distance / 1000).toFixed(1)}公里。途径：`;
            p.steps.forEach((step: any) => {
                pathStr += step.road ? (step.road + '、') : '';
            });
            paths.value.push({ id: index + 1, msg: pathStr });
        });
    } else {
        let index = 0;
        naviData.value.forEach((p: any) => {
            let pathStr = `全长：${(p.distance / 1000).toFixed(1)}公里。`;
            p.instructions.forEach((instruction: any) => {
                pathStr += instruction.text + `行驶${(instruction.distance / 1000).toFixed(1)}公里(预计${(instruction.time / 60000).toFixed(1)}分钟)。  `;
            });
            paths.value.push({ id: index + 1, msg: pathStr });
        });
    }
}
async function saveNaviData() {
    if (naviData.value) {
        saveAs(new Blob([JSON.stringify(naviData.value)], { type: 'text/plain;charset=utf-8' }), '导航数据.json');
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

function saveAs(blob: Blob, fileName: string) {
    const downLink = document.createElement('a');
    downLink.download = fileName;
    downLink.href = URL.createObjectURL(blob);
    // 链接插入到页面
    document.body.appendChild(downLink);
    downLink.click();
    // 移除下载链接
    document.body.removeChild(downLink);
}
</script>

<style lang="scss" scoped>
.label-container {
    color: #009b94;
    display: inline-block;
    max-width: 100%;
    margin-bottom: 5px;
    font-weight: 700;
    font-size: 14px;
}

.el-input {
    height: 25px;
    --el-input-border-color: #333;
    --el-input-text-color: #333;
    --el-input-bg-color: rgb(170, 170, 170);
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
