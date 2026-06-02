<template>
    <win-tabs :initCSS="{ width: 300, height: 290, left: 350, top: 380 }" @close="close">
        <tab-pane label="地形开挖">
            <div style="margin-bottom: 5px">
                <el-row>
                    <el-col :span="8"><label class="label-container">开挖高度：</label></el-col>
                    <el-col :span="16">
                        <input v-model.number="depth" :max="1000" :min="0.1" :step="0.1" type="number" />
                    </el-col>
                </el-row>
            </div>
            <div style="text-align: center;padding-top: 10px">
                <el-button size="small" @click="drawRegion">开挖</el-button>
                <el-button size="small" @click="clear()">清空</el-button>
            </div>
            <div class="surface-group" v-if="volume">
                <div class="surface-text">方量：{{ volume.toFixed(3) }}m²</div>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script setup lang="ts">
import { TabPane, WinTabs } from '../../../winTabs'
import { DrawShape } from "@/lib/CesiumEarth/ts/DrawShape";
import { CoordinateType } from "@/lib/CesiumEarth/ts/DrawShape/CoordinateType";
import { surfaceExcavate, surfaceExcavateAnalysis } from "@/lib/CesiumEarth/ts/SpatialAnalysis";
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { useEarthStore } from "@/stores/EarthStore";
import { EllipsoidTerrainProvider, Cartesian3 } from "cesium";
import { onMounted, ref } from "vue";

const depth = ref(100);
const volume = ref(0);
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()
let excavate: surfaceExcavateAnalysis;
let draw: DrawShape;
let surface: surfaceExcavate | undefined;
let viewer;
onMounted(async () => {
    const earth = await earthStore.getEarth()
    viewer = earth.viewer3D
    viewer.terrainProvider = new EllipsoidTerrainProvider();
    viewer.scene.globe.depthTestAgainstTerrain = true;
    excavate = new surfaceExcavateAnalysis(viewer);
    draw = new DrawShape(earth.viewer3D);
});

const drawRegion = () => {
    draw.drawPolygon({
        coordinateType: CoordinateType.cartesian3,
        endCallback: async (positions: Cartesian3[]) => {
            clear();
            surface = await excavate.create(positions, {
                depth: depth.value,
            });
            // 计算方量
            const v = surface.computeCutVolume();
            volume.value = v;
        },
        errCallback: (err: any) => {
            console.error(err);
        }
    });
}

const clear = () => {
    surface && excavate.remove(surface);
    surface = undefined;
    volume.value = 0;
}
function close() {
    clear();
    ceStore.setCesiumEarthComAction('surfaceExcavateAnalysis', 2)
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
</style>
