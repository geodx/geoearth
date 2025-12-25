<template>
    <div class="toolRow">
        <button class="btn btn-info btn-sm" style="margin-right: 5px" @click="start">特效演示</button>
        <button class="btn btn-info btn-sm" @click="reset">清空效果</button>
    </div>
</template>

<script lang="ts" setup>
import CesiumEarth from '@/lib/CesiumEarth'
import { useEarthStore } from '@/stores/EarthStore'
import { Cartesian3 } from 'cesium'
import { onMounted, onUnmounted } from 'vue'

const earthStore = useEarthStore()

const options = {
    backGround: new URL('/app/vge/regionLabel/beij.083ca80f.png', import.meta.url).href,                  //周围行政区背景图
    wallgradients: new URL('/app/vge/regionLabel/wallgradients.png', import.meta.url).href,                //行政区边界墙体效果
    size: 0.5,                                              //标签大小
    colorLine: [.10, .10, .10],                               //周围行政区别界线颜色
    colorPolygon: [.10, .15, .15]                             //周围行政区边境面颜色
}
let regionLabel: CesiumEarth.RegionLabel
let LEDLabel: any = []

let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    earth.viewer3D.scene.camera.setView({
        destination: new Cartesian3(-2285318.922205349, 4561449.436806091, 4046846.8682504706),
        orientation: {
            heading: 6.174723072454894,
            pitch: -0.71825433447645,
            roll: 0.0000010271026651409443
        },
    });
})
onUnmounted(() => {
    reset()
})
function start() {
    let regionJson = [];
    regionJson.push(fetch('./app/vge/regionLabel/beijing_2.json').then(res => {
        return res.json();
    }).then(res => {
        return res.features;
    }));
    regionJson.push(fetch('./app/vge/regionLabel/beijing_3.json').then(res => {
        return res.json();
    }).then(res => {
        return res.features;
    }));
    regionJson.push(fetch('./app/vge/regionLabel/beijing_2.json').then(res => {
        return res.json();
    }).then(res => {
        return res.features;
    }));
    regionLabel = new CesiumEarth.RegionLabel(
        earth.viewer3D, options, regionJson
    );
    fetch('./app/vge/regionLabel/beijing_3point.json')
        .then(res => {
            return res.json();
        })
        .then(res => {
            res.features.map((feature: any) => {
                let coordinates = feature.geometry.coordinates;
                let c = Cartesian3.fromDegrees(coordinates[0], coordinates[1], 15010);
                LEDLabel.push(new CesiumEarth.SuperiorEntity.LEDLabel(earth.viewer3D, c, 3000 + Math.floor(Math.random() * 100)));
            });
        });
}
//清除
function reset() {
    regionLabel?.remove();
    if (LEDLabel.length == 0) {
        return 0;
    }
    for (let i = 0; i < LEDLabel.length; i++) {
        LEDLabel[i].remove();
    }
    LEDLabel = [];
}

</script>

<style lang="scss" scoped>
.toolRow {
    text-align: center;
}
</style>
