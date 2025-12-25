<template>
    <win-tabs :initCSS="{ width: 350, height: 250, left: 400, top: 300 }" @close="close">
        <tab-pane label="VR立体屏幕" style="height: 100%">
            <div style="height: 100%">

                <div>
                    <el-row>
                        <el-col :span="4">眼距:</el-col>
                        <el-col :span="12">
                            <div class="grid-content ep-bg-purple-light" />
                            <el-slider v-model="eyeSeparation" :max="eyeSeparationRange * 1"
                                :min="eyeSeparationRange * -1" class="m-12" @input="setEyeSeparation(eyeSeparation)" />
                        </el-col>
                        <el-col :span="2">&nbsp;</el-col>
                        <el-col :span="6">
                            <div class="grid-content ep-bg-purple" />
                            <el-select v-model.number="eyeSeparationRange" class="m-2" placeholder="Select" size="small"
                                style="width: 70px;">
                                <el-option v-for="item in eyeSeparationRangeArr" :label="String(item)" :value="item" />
                            </el-select>
                        </el-col>
                    </el-row>
                </div>

                <div style="margin:  30px 0">
                    <span>默认场景：</span>
                    <el-select v-model="selScene" clearable placeholder="Select" size="small" style="width: 200px">
                        <el-option v-for="item in sceneList" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </div>

                <div style="text-align: center">
                    <button class="btn btn-default" type="button" @click="turnOn">切换VR模式</button>
                </div>

            </div>
        </tab-pane>
    </win-tabs>
</template>


<script lang="ts" setup>
import { useEarthStore } from '@/stores/EarthStore'
import { TabPane, WinTabs } from '../../winTabs'
import { onMounted, onUnmounted, ref } from 'vue'
import CesiumEarth from '@/lib/CesiumEarth'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore'
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()
const eyeSeparationRangeArr = ref([10, 50, 200, 500, 2000, 5000])
const eyeSeparationRange = ref(300)
const focalLengthRange = ref(10)
const eyeSeparation = ref(0)
const focalLength = ref(0)
const selScene = ref('Option1')
const sceneList = ref([
    {
        value: 'Option1',
        label: '居民楼-小尺度'
    },
    {
        value: 'Option2',
        label: '居民楼-大尺度'
    },
    {
        value: 'Option3',
        label: '山脉-大尺度'
    }
])
let handleKeyDown: any;
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    handleKeyDown = (keyboardEvent: KeyboardEvent) => {
        if (keyboardEvent.code === 'ArrowRight') {
            eyeSeparation.value++;
        } else if (keyboardEvent.code === 'ArrowLeft') {
            eyeSeparation.value--;
        } else if (keyboardEvent.code === 'NumpadAdd') {
            eyeSeparation.value++;
        } else if (keyboardEvent.code === 'NumpadSubtract') {
            eyeSeparation.value--;
        }

        setEyeSeparation(eyeSeparation.value);
    };
    window.addEventListener('keydown', handleKeyDown);
})
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
})

function turnOn() {
    // $router.push({ path: '/VRScreen' });

    // 打开新页面
    window.open(window.location.origin + '/#/VRScreen');

    localStorage.setItem('VRScreenData', JSON.stringify({
        eyeSeparation: eyeSeparation.value,
        eyeSeparationRange: eyeSeparationRange.value,
        focalLength: focalLength.value,
        focalLengthRange: focalLengthRange.value,
        selScene: selScene.value,
        cameraInfo: CesiumEarth.CameraUtils.getCameraInfo(earth.viewer3D)
    }));

    // if (open) {
    //     closeVR3d();
    //     open = false;
    // } else {
    //     openVR3d();
    //     open = true;
    // }
}
function openVR3d() {
    earth.viewer3D.scene.useWebVR = true;
    // earth.viewer3D.scene._cameraVR.frustum.far = 8.0;
}
function closeVR3d() {
    earth.viewer3D.scene.useWebVR = false;
}
// 焦距
function setFocalLength(focalLengthValue: number) {
    earth.viewer3D.scene.useWebVR = true;
    earth.viewer3D.scene.focalLength = focalLengthValue * 1;
    // earth.viewer3D.scene.eyeSeparation = focalLengthValue / 30.0;
}
// 眼距
function setEyeSeparation(eyeSeparation: number) {
    earth.viewer3D.scene.useWebVR = true;
    earth.viewer3D.scene.eyeSeparation = eyeSeparation * 1;
}
function close() {
    ceStore.setCesiumEarthComAction('vr3d', 2)
}


</script>

<style lang="less" scoped></style>
