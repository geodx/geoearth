<template>
    <win-tabs :initCSS="{ width: 300, height: 290, left: 350, top: 380 }" @close="close">
        <tab-pane label="限高分析">
            <div class="height-slider">
                <span class="slider-label">限高：</span>
                <el-Slider v-model="height" :min="400" :max="500" :step="1"></el-Slider>
            </div>
            <div class="btn-group">
                <el-button type="primary" @click="show" class="comm-btn">显示</el-button>
                <el-button type="warning" @click="heightLimit.destroy()" class="comm-btn"
                    contentClass="clear">隐藏</el-button>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script setup lang="ts">
import { TabPane, WinTabs } from '../../../winTabs'
import { heightLimitAnalysis } from "@/lib/CesiumEarth/ts/SpatialAnalysis";
import { PolygonHierarchy, Cartesian3, Cesium3DTileset } from "cesium";
import { onMounted, ref, watch } from "vue";
import { useEarthStore } from "@/stores/EarthStore";
import { useCesiumEarthStore } from "@/stores/CesiumEarthStore";
import { Cartographic, Matrix4, sampleTerrainMostDetailed } from 'cesium';
import { DrawShape } from '@/lib/CesiumEarth/ts/DrawShape';
import { CoordinateType } from '@/lib/CesiumEarth/ts/DrawShape/CoordinateType';
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()
let heightLimit: heightLimitAnalysis;
const height = ref(450);   // 调节高度
watch(height, (v) => {
    heightLimit.height = v;
})

let viewer;
onMounted(async () => {
    const earth = await earthStore.getEarth()
    viewer = earth.viewer3D

    const h = new PolygonHierarchy([
        new Cartesian3(-1715231.805688242, 4993415.26274802, 3567023.0589824845),
        new Cartesian3(-1715559.2425164199, 4993300.092233208, 3567023.303395297),
        new Cartesian3(-1715645.754204674, 4993545.225431734, 3566639.949250538),
        new Cartesian3(-1715317.7878784728, 4993658.854461889, 3566638.5962640895),
    ])
    heightLimit = new heightLimitAnalysis(viewer, h, height.value);
    heightLimit.init();
    // 加载3DTileset 
    const tileset = await Cesium3DTileset.fromUrl("http://localhost:9004/tile/model/service/D2FesNFa/tileset.json")
    viewer.scene.primitives.add(tileset)
    viewer.flyTo(tileset)
});

const show = () => {
    heightLimit.init();
    heightLimit.height = height.value;
}

const clear = () => {
    heightLimit && heightLimit.destroy();
    heightLimit.height = 450;
}
function close() {
    clear();
    ceStore.setCesiumEarthComAction('heightLimitAnalysis', 2)
}
</script>

<style lang="scss" scoped>
.btn-group {
    text-align: center;
    padding-top: 10px;
}
</style>
