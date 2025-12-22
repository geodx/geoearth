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
import notify from '../lib/notify';
import { useEarthStore } from '@/stores/EarthStore';
const earthStore = useEarthStore()
const featureCount = ref(0)
let plotTool: any;
let t: number = 0;

onMounted(() => {
    const earth = await earthStore.getEarth()
    plotTool = earth.plotTool;
    t = setInterval(() => {
        this.featureCount = earth.plotTool.GeoJson.features.length;
    }, 200);
})
onUnmounted(() => {
    clearInterval(t);
})
function SaveAsGeoJson() {
    plotTool.SaveAsGeoJson(function (msg) {
        notify({ message: msg, status: 'success' });
    });
},
function SaveAsKML() {
    plotTool.SaveAsKML(function (msg) {
        notify({ message: msg, status: 'success' });
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
