<template>
    <win-tabs :initCSS="{ width: 300, height: 290, left: 350, top: 380 }" @close="close">
        <tab-pane label="烟雾粒子">
            <div class="app-wrapp">
                <div class="symbol-item">
                    <img :src="symbolList.symbolImage" alt="fountain" class="symbol-img" />
                    <span class="symbol-name">{{ symbolList.name }}</span>
                </div>
                <smokeEditPanel v-if="maximumSpeed != null" />
                <br />
                <button class="btn btn-sm btn-success" style="margin-right: 40px" @click="clear()">清空</button>
                <!--<button @click="pickPoint()" class="btn btn-sm btn-success">保存</button>-->
                <button class="btn btn-sm btn-success" @click="pickPoint()">添加</button>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script setup lang="ts">

import { TabPane, WinTabs } from '../../../winTabs'
import smokeEditPanel from './EditPanel/smokeEditPanel.vue';
import particleStore from './EditPanel/particleStore.js';
import { onMounted, ref } from 'vue';
import CesiumEarth from '@/lib/CesiumEarth/index.js';
import { Viewer } from 'cesium';
import { useEarthStore } from '@/stores/EarthStore.js';
import { CoordinateType } from '@/lib/CesiumEarth/ts/DrawShape/CoordinateType.ts';
import { Cartographic, Cartesian3, Entity } from 'cesium';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore.js';
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()
const maximumSpeed = ref() //控制粒子参数显隐
const plotSelecteable = ref(false)//默认元素不可选
const symbolList = ref(
    {
        name: '烟雾',
        type: 'fire',
        symbolImage: new URL('../img/smoke.jpg', import.meta.url).href
    })


let particlePlot;
let viewer: Viewer

onMounted(async () => {
    const earth = await earthStore.getEarth()
    viewer = earth.viewer3D
})
function pickPoint() {
    let drawShape = new CesiumEarth.DrawShape(viewer);
    drawShape.drawPoint({
        coordinateType: CoordinateType.cartographicObj,
        endCallback: (ps: Cartographic[]) => {

            const position = Cartesian3.fromDegrees(ps[0].longitude, ps[0].latitude, ps[0].height)
            particlePlot = new CesiumEarth.SmokeParticle(viewer, position);
            particleListener();//开启监听
        },
        errCallback: function () {
            clear();
        }
    });
}

//监听点击粒子
function particleListener() {
    CesiumEarth.EventManage.screenEvent.addEventListener(
        CesiumEarth.ScreenSpaceEventType.LEFT_CLICK,
        CesiumEarth.ScopeType.Viewer3D,
        (e: any) => {
            const pick = viewer.scene.pick(e.position);
            if (!pick) {
                selectedEntityChanged(undefined);
                return;
            }
            //拾取到粒子系统对象
            if (pick.primitive && pick.collection) {
                selectedEntityChanged(pick);
            } else {
                selectedEntityChanged(undefined);
            }
        }
    );
}
//选中粒子，把该粒子存入particleStore
function selectedEntityChanged(selectedEntity: any) {
    if (!selectedEntity) {
        clearSelectedPlot();
        return;
    }
    const plot = getPlotBy_textureAtlasGUID(selectedEntity.collection._textureAtlasGUID);
    if (!plot) {
        clearSelectedPlot();
        return;
    }
    particleStore.selectedPlot = plot;
    maximumSpeed.value = plot.style.maximumSpeed;
}

function setPlotSelectable(selecteable: boolean) {
    plotSelecteable.value = selecteable;
}

//获取粒子对象
function getPlotBy_textureAtlasGUID(_textureAtlasGUID: string) {
    for (let i = 0; i < particleStore.plots.length; i++) {
        let plot = particleStore.plots[i];
        if (plot.particleSystem._billboardCollection._textureAtlasGUID == _textureAtlasGUID) {
            return plot;
        }
    }
}

//隐藏粒子信息
function clearSelectedPlot() {
    if (particleStore.selectedPlot) {
        maximumSpeed.value = undefined;
    }
}

//清空
function clear() {
    particleStore.plots.forEach(item => {
        item.remove();
    });
    particleStore.plots = [];
    maximumSpeed.value = null;
}
function close() {
    clear();
    ceStore.setCesiumEarthComAction('smokePlot', 2)
}

</script>

<style lang="scss" scoped>
label {
    color: #009b94;
}

.app-wrapp {
    text-align: center;
    margin-bottom: 5px;
}

.symbol-item {
    margin: 2px;
    height: 160px;
    width: 180px;
    display: inline-block;
    position: relative;
}

.symbol-img {
    height: 100%;
    width: 100%;
}

.symbol-name {
    display: inline-block;
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    text-align: center;
    background: #14549e;
    color: white;
}
</style>
