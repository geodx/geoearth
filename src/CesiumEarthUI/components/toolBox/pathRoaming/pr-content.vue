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
                            <el-option v-for="item in pathRoamList" :key="item" :label="item.labe" :value="item.value">
                            </el-option>
                        </el-select>
                    </el-col>
                </el-row>
            </div>


            <div v-if="roamingType === CesiumEarth.RoamingEnum.UAV_ROAM" style="margin-bottom: 5px">
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
import { useEarthStore } from '@/stores/EarthStore';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()


const pathRoamList = [
    { labe: '行人漫游', value: CesiumEarth.RoamingEnum.PEOPLE_ROAM },
    { labe: '车辆漫游', value: CesiumEarth.RoamingEnum.CAR_ROAM },
    { labe: '飞行漫游', value: CesiumEarth.RoamingEnum.UAV_ROAM },
]

const roamingType = ref<CesiumEarth.RoamingEnum>(CesiumEarth.RoamingEnum.CAR_ROAM)
const pathRoamHeight = ref(10)
const showPath = ref(true)
const drawLineDone = ref(false)

let pathRoaming: any = null;
onUnmounted(() => {
    stop();
})

onMounted(async () => {
    const earth = await earthStore.getEarth()
    pathRoaming = new CesiumEarth.PathRoaming(earth.viewer3D, {
        speed: 10,
        roamingType: roamingType.value
    });
})
watch(() => showPath, (newValue) => {
    pathRoaming.showPath = newValue;
})

async function drawLine() {
    await pathRoaming.drawLine(pathRoamHeight.value);
    drawLineDone.value = true;
}
function setRoamingType() {
    pathRoaming.setRoamingType(roamingType.value);
}
function start() {
    if (!pathRoaming || !drawLineDone.value) {
        return;
    }
    pathRoaming.startRoaming();
}
function pause() {
    if (!pathRoaming || !drawLineDone.value) {
        return;
    }
    pathRoaming.pauseRoaming();
}
function stop() {
    if (!pathRoaming || !drawLineDone.value) {
        return;
    }
    pathRoaming.stopRoaming();
    drawLineDone.value = false;
}
function accelerateUp() {
    const speed = pathRoaming.getRoamingSpeed();
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
