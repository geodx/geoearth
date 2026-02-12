<template>
    <div id="export-plot">
        <table class="table table-bordered table-hover">
            <thead>
                <tr>
                    <th style="padding: 8px">属性</th>
                    <th style="padding: 8px">值</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>要素</td>
                    <td>{{ featureCount }}个</td>
                </tr>
            </tbody>
        </table>
        <div style="text-align: center">
            <button class="btn btn-primary" style="margin-right: 5px" @click="SaveAsKML">
                导出为 XML
            </button>
            <button class="btn btn-primary" @click="SaveAsGeoJson">
                导出为 GeoJson
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>


import { onMounted, onUnmounted, ref } from 'vue';
import { useEarthStore } from '@/stores/EarthStore';
import { ElMessage } from 'element-plus';
const earthStore = useEarthStore()
const featureCount = ref(0)
let plotTool: any;
let t: number = 0;

onMounted(async () => {
    const earth = await earthStore.getEarth()
    plotTool = earth.plotTool;
    t = setInterval(() => {
        featureCount.value = earth.plotTool.GeoJson.features.length;
    }, 200);
})
onUnmounted(() => {
    clearInterval(t);
})
function SaveAsGeoJson() {
    plotTool.SaveAsGeoJson(function (msg: string) {
        ElMessage(msg)
    });
}
function SaveAsKML() {
    plotTool.SaveAsKML(function (msg: string) {
        ElMessage(msg)
    });
}

</script>

<style lang="scss" scoped>
#export-plot {
    padding: 15px;
    height: 100%;
    overflow: auto;
    border: black 1px dashed
}
</style>
