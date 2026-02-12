<template>
    <win-tabs :draggable="isDragging" :initCSS="{ width: 300, height: 290, left: 350, top: 380 }" @close="close">
        <tab-pane class="win" label="火焰粒子">
            <div class="app-wrapp">
                <div class="symbol-item">
                    <img :src="symbolList.symbolImage" alt="fire" class="symbol-img" />
                    <span class="symbol-name">{{ symbolList.name }}</span>
                </div>
                <fireEditPanel v-if="maximumSpeed != null" :getKey="isDragging" @changeKey="handleMouse" />
                <br />
                <button class="btn btn-sm btn-success" style="margin-right: 40px" @click="clear()">清空</button>
                <!--<button @click="pickPoint()" class="btn btn-sm btn-success">保存</button>-->
                <button class="btn btn-sm btn-success" @click="pickPoint()">添加</button>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import CesiumEarth from '@/lib/CesiumEarth';
import { TabPane, WinTabs } from '../../../winTabs'
import fireEditPanel from './EditPanel/fireEditPanel.vue';
import particleStore from './EditPanel/particleStore';
import { onMounted, ref } from 'vue';
import { useEarthStore } from '@/stores/EarthStore';
import { CoordinateType } from '@/lib/CesiumEarth/ts/DrawShape/CoordinateType';
import { Cartesian3 } from 'cesium';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()
const isDragging = ref(true)
const maximumSpeed = ref() //控制粒子参数显隐
const plotSelecteable = ref(false) //默认元素不可选
const symbolList = ref({
    name: '火焰',
    type: 'fire',
    symbolImage: new URL('../img/fire.jpg', import.meta.url).href
})


let particlePlot;
let earth: CesiumEarth.Earth;

onMounted(async () => {
    earth = await earthStore.getEarth()
})
/**鼠标按下时窗口不可被拖动,鼠标松开恢复**/
function handleMouse(newkey: boolean) {
    isDragging.value = newkey;
}
//添加粒子
function pickPoint() {
    let drawShape = new CesiumEarth.DrawShape(earth.viewer3D);
    drawShape.drawPoint({
        coordinateType: CoordinateType.cartographicObj,
        endCallback: (ps: any[]) => {
            const position = Cartesian3.fromDegrees(ps[0].longitude, ps[0].latitude, ps[0].height)
            let entity = earth.viewer3D.entities.add({
                position
            });
            // particlePlot = new CesiumEarth.FirePlot(entity);
            particlePlot = new CesiumEarth.FireParticle(earth.viewer3D, position)
            particleStore.plots.push(particlePlot);
            particleListener();//开启监听
            // console.log(particlePlot.style) 

        },
        errCallback: () => {
            clear();
        }
    })
}

//监听点击粒子
function particleListener() {
    CesiumEarth.EventManage.screenEvent.addEventListener(
        CesiumEarth.ScreenSpaceEventType.LEFT_CLICK,
        CesiumEarth.ScopeType.Viewer3D,
        (e: any) => {
            let pick = earth.viewer3D.scene.pick(e.position);
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
        maximumSpeed.value = null;
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
    ceStore.setCesiumEarthComAction('firePlot', 2)
}
</script>

<style lang="less" scoped>
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
