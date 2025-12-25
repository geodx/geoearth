<template>
    <win-tabs :initCSS="{ width: 300, height: 280, left: 350, top: 380 }" class="move_box" @close="close">
        <tab-pane label="路径漫游">

            <div style="margin-bottom: 5px">
                <el-row>
                    <el-col :span="6">
                        <label class="label-container">漫游方式</label>
                    </el-col>
                    <el-col :span="14">
                        <el-select v-model="roamingType" placeholder="请选择漫游方式" size="small" @change="setRoamingType">
                            <el-option v-for="item in pathRoamList" :key="item" :label="item" :value="item">
                            </el-option>
                        </el-select>
                    </el-col>
                </el-row>
            </div>


            <div v-if="roamingType === '飞行漫游'" style="margin-bottom: 5px">
                <el-row>
                    <el-col :span="6">
                        <label class="label-container">离地高度</label>
                    </el-col>
                    <el-col :span="14">
                        <el-input v-model.number="pathRoamHeight" size="small"></el-input>
                    </el-col>
                </el-row>
            </div>


            <div style="margin-bottom: 5px">
                <el-row>
                    <el-col :span="6">
                        <label class="label-container">显示路径</label>
                    </el-col>
                    <el-col :span="14">
                        <el-switch v-model="showPath"></el-switch>
                    </el-col>
                </el-row>
            </div>

            <div style="margin-bottom: 5px">
                <el-row>
                    <el-col :span="6">
                        <label class="label-container">路径设定</label>
                    </el-col>
                    <el-col :span="14">
                        <button :disabled="drawLineDone" class="btn btn-sm btn-success" style="margin-right: 5px"
                            @click="drawLine">画线</button>
                        <button :disabled="!drawLineDone" class="btn btn-sm btn-warning" @click="stop">清除</button>
                    </el-col>
                </el-row>
            </div>


            <div style="margin-bottom: 5px">
                <el-row>
                    <el-col :span="6">
                        <label class="label-container">控制</label>
                    </el-col>
                    <el-col :span="18">
                        <button :disabled="!drawLineDone" class="btn btn-info btn-sm" style="margin-right: 3px"
                            @click="start">开始</button>
                        <button :disabled="!drawLineDone" class="btn btn-info btn-sm" style="margin-right: 3px"
                            @click="pause">暂停</button>
                        <button :disabled="!drawLineDone" class="btn btn-info btn-sm" style="margin-right: 3px"
                            @click="accelerateUp">加速</button>
                        <button :disabled="!drawLineDone" class="btn btn-info btn-sm"
                            @click="accelerateDown">减速</button>

                    </el-col>
                </el-row>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { TabPane, WinTabs } from '../../winTabs'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import CesiumEarth from '@/lib/CesiumEarth';
const ceStore = useCesiumEarthStore()


const pathRoamList: [
    // '贴地漫游',
    '行人漫游',
    '车辆漫游',
    '飞行漫游'
]
const roamingType = ref('车辆漫游')
const pathRoamHeight = ref(0)
const showPath = ref(true)
const drawLineDone = ref(false)

let pathRoaming: any = null;
onUnmounted(() => {
    stop();
})

onMounted(() => {
    pathRoaming = new CesiumEarth.PathRoaming(CesiumEarth.getMainViewer(), {
        speed: 10,
        roamingType: roamingType.value
    });
})
watch(() => showPath, (newValue) => {
    pathRoaming.showPath = newV;
})

async function drawLine() {
    await pathRoaming.drawLine(this.pathRoamHeight);
    this.drawLineDone = true;
}
function setRoamingType() {
    pathRoaming.setRoamingType(this.roamingType);
    console.log(this.roamingType);
}
function start() {
    if (!pathRoaming || !this.drawLineDone) {
        return;
    }
    pathRoaming.startRoaming();
}
function pause() {
    if (!pathRoaming || !this.drawLineDone) {
        return;
    }
    pathRoaming.pauseRoaming();
}
function stop() {
    if (!pathRoaming || !this.drawLineDone) {
        return;
    }
    pathRoaming.stopRoaming();
    this.drawLineDone = false;
}
function accelerateUp() {
    let speed = pathRoaming.getRoamingSpeed();
    console.log('speed:' + speed);
    pathRoaming.setRoamingSpeed(speed + 10);
}
function accelerateDown() {
    let speed = pathRoaming.getRoamingSpeed();
    console.log('speed:' + speed);
    pathRoaming.setRoamingSpeed(speed - 10);
}
function close() {
    ceStore.setCesiumEarthComAction('pathRoaming', 2)
} 
</script>

<style lang="scss" scoped>
label {
    color: #009b94;
}
</style>
