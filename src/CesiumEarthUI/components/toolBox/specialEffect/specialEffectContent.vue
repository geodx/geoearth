<template>
    <div class="tool-effect-menu">
        <div v-for="item in tool" class="liBox" style="height:25px;">
            <div>
                <img :alt="item.name" :src="item.iconUrl">
                <label class="label-container" style="color:white;">{{ item.name }}</label>
            </div>
            <el-slider v-if="item.class == 'dbtm'" v-model="dbtmValue" :max="1" :min="0" :show-tooltip="true"
                :step="0.1" class="slider-value" @input="valueChange1"></el-slider>
            <el-slider v-if="item.class == 'dxkz'" v-model="dxkzValue" :max="5" :min="0" :show-tooltip="true" :step="1"
                class="slider-value" @input="valueChange"></el-slider>
            <el-switch v-else v-model=item.value.a active-color="#13ce66" inactive-color="#929090"
                @change="item.status = toggleEffect(item.class, item.status)">
            </el-switch>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Viewer } from 'cesium';
import { useEarthStore } from '@/stores/EarthStore';
const earthStore = useEarthStore()
defineProps(['tool', 'toggleEffect']);
const dxkzValue = ref(1);
const dbtmValue = ref(0.8);
let viewer: Viewer;
onMounted(async () => {
    const earth = await earthStore.getEarth();
    viewer = earth.viewer3D;
})
function valueChange() {
    viewer.scene.verticalExaggeration = dxkzValue.value;
};
function valueChange1() {
    viewer.scene.globe.translucency.frontFaceAlpha = dbtmValue.value;
}

</script>

<style lang="scss" scoped>
.tool-effect-menu {
    border-bottom: 1px solid rgba(185, 197, 185, 0.2);
}

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

.el-slider {
    width: 70px;
}
</style>
