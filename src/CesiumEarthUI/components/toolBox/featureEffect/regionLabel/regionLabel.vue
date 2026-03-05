<template>
    <div class="toolRow">
        <div>
            <el-row class="form-item">
                <el-col :span="8">
                    <label class="label-container">省份</label>
                </el-col>
                <el-col :span="16">
                    <el-select v-model="provinceName" clearable placeholder="请选择" size="small">
                        <el-option v-for="item in proviceValue" :key="item.index" :label="item.label"
                            :value="item.value">
                        </el-option>
                    </el-select>
                </el-col>
            </el-row>
        </div>
        <button class="btn btn-info btn-sm" style="margin-left: 50px" @click="start">特效演示</button>
        <button class="btn btn-info btn-sm" @click="reset">清空效果</button>
    </div>
</template>

<script lang="ts" setup>
import CesiumEarth from '@/lib/CesiumEarth'
import { useEarthStore } from '@/stores/EarthStore'
import { Cartesian3 } from 'cesium'
import { onMounted, onUnmounted, ref } from 'vue'
const earthStore = useEarthStore()
const provinceName = ref<string>('beijing')
const proviceValue = ref([
    { index: 0, value: 'beijing', label: '北京' },
    { index: 1, value: 'hubei', label: '湖北' }
])


const options = {
    backGround: '/CesiumEarth/regionLabel/beij.083ca80f.png', //周围行政区背景图
    wallgradients: '/CesiumEarth/regionLabel/wallgradients.png', //行政区边界墙体效果
    size: 0.5, //标签大小
    colorLine: [0.1, 0.1, 0.1], //周围行政区别界线颜色
    colorPolygon: [0.1, 0.15, 0.15] //周围行政区边境面颜色
}
type RegionConfig = {
    regionArea: string
    proviceArea: string
    view: {
        destination: Cartesian3
        orientation: object
        duration: number
    }
}
const regionJsonUrl: Record<string, RegionConfig> = {
    beijing: {
        regionArea: '/CesiumEarth/regionLabel/beijing_2.json',
        proviceArea: '/CesiumEarth/regionLabel/beijing_3.json',
        view: {
            destination: new Cartesian3(-2285318.922205349, 4561449.436806091, 4046846.8682504706),
            orientation: {
                heading: 6.174723072454894,
                pitch: -0.71825433447645,
                roll: 0.0000010271026651409443
            },
            duration: 2
        },
        // proviceContent: "/CesiumEarth/regionLabel/beijing_2.json"
    },
    hubei: {
        regionArea: '/CesiumEarth/regionLabel/region.json',
        proviceArea: '/CesiumEarth/regionLabel/CHN_adm2.json',
        // proviceContent: "/CesiumEarth/regionLabel/region.json"
        view: {
            destination: new Cartesian3(-3036049.2049679733, 6765587.416918585, 3452995.864224429),
            orientation: {
                heading: 5.889445354861434,
                pitch: -1.2687745954690257,
                roll: 0.00023910045793762436
            },
            duration: 2
        }
    }
}

let regionJson = []
let isStart = false

let regionLabelArea: CesiumEarth.RegionLabel;
let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
})
onUnmounted(() => {
    reset();
    earth.viewer3D.scene.globe.depthTestAgainstTerrain = true;
})

async function start() {
    earth.viewer3D.scene.globe.depthTestAgainstTerrain = false;
    if (provinceName.value === '') {
        return;
    }
    reset();
    let promiseFetch = [
        fetch(regionJsonUrl[provinceName.value]?.regionArea!),
        fetch(regionJsonUrl[provinceName.value]?.proviceArea!)
        // fetch(regionJsonUrl[provinceName].proviceContent)
    ];
    regionJson = await Promise.all(promiseFetch)
        .then(res => {
            return res.map(x => x.json());
        })
        .then(async res => {
            const x = await Promise.all(res);
            return x.map(res => res.features);
        });
    const view = regionJsonUrl[provinceName.value]?.view!
    earth.viewer3D.scene.camera.setView(view);
    regionLabelArea = new CesiumEarth.RegionLabel(
        earth.viewer3D,
        options,
        regionJson
    );

    isStart = true;
}
function reset() {
    if (isStart) {
        regionLabelArea.remove();
    }
    isStart = false;
}

</script>

<style lang="scss" scoped>
.toolRow {
    text-align: center;
}

.toolRow button {
    margin-top: 10px;
    margin-right: 5px;
}

label {
    color: #009b94;
}

.el-input--mini .el-input__inner {
    height: 35px;
    line-height: 28px;
}
</style>
