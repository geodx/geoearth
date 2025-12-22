/****************************************************************************
名称：地质剖面线
****************************************************************************/

<template>
    <win-tabs :initCSS="{ width: 650, height: 400, left: 400, top: 300 }" @close="close">
        <tab-pane label="地形剖面">
            <div id="msPane">
                <div>
                    操作：
                    <button class="btn btn-sm btn-success" style="width: 100px;" type="button"
                        @click="surfaceArea">绘制剖面线
                    </button>
                    <button class="btn btn-sm btn-warning" type="button" @click="clearChart">重置</button>
                </div>
                <div v-if="startPoint">起始点：{{ startPoint.longitude }}°{{ startPoint.latitude }}°</div>
                <div v-if="endPoint">终止点：{{ endPoint.longitude }}°{{ endPoint.latitude }}°</div>
            </div>
            <div ref="chartRef" class="chart"></div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { TabPane, WinTabs } from '../../winTabs'
import { useEarthStore } from '@/stores/EarthStore';
import CesiumEarth from '@/lib/CesiumEarth';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { CoordinateType } from '@/lib/CesiumEarth/ts/DrawShape/CoordinateType';
import { Cartographic, Cartesian3, Color } from 'cesium';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, ToolboxComponent, GridComponent } from 'echarts/components';
echarts.use([
    CanvasRenderer, TitleComponent, TooltipComponent, ToolboxComponent, GridComponent
]);
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()
const chartRef = ref<HTMLElement>();

let myChart: any;
let redLine: any;
let ChartResize: any;
let earth: CesiumEarth.Earth;
const startPoint = ref()
const endPoint = ref()

onMounted(async () => {
    earth = await earthStore.getEarth()
})
onUnmounted(() => {
    clearChart();
})
// 绘制剖面线
async function drawLine(): Promise<Cartographic[]> {
    return new Promise((resolve, reject) => {
        earth.drawShape.drawLine(
            {
                coordinateType: CoordinateType.cartographicObj,
                endCallback: (e: Cartographic[]) => resolve(e)
            }
        );
    });
}
// 生成剖面线
async function surfaceArea() {
    let l = await drawLine();
    if (l && l[0] && l[1]) {
        startPoint.value = l[0];
        endPoint.value = l[1];
        let pointArr = [];
        // pointArr.push({ longitude: l[0]!.latitude, latitude: l[0]!.longitude, height: 0 });
        // pointArr.push({ longitude: l[1]!.latitude, latitude: l[1]!.longitude, height: 0 });
        for (let i = 0; i < 100; i++) {
            let lon = l[0].longitude - (l[0].longitude - l[1].longitude) / 100 * i;
            let lat = l[0].latitude - (l[0].latitude - l[1].latitude) / 100 * i;
            pointArr.push({ longitude: lon, latitude: lat, height: 0 });
        }
        pointArr = await CesiumEarth.getMostDetailedHeight(earth.viewer3D, pointArr);
        drawChart(pointArr);

        redLine && earth.viewer3D.entities.remove(redLine);
        redLine = null;
        redLine = earth.viewer3D.entities.add({
            name: 'Red line on terrain',
            polyline: {
                positions: Cartesian3.fromDegreesArray([
                    l[0].longitude,
                    l[0].latitude,
                    l[1].longitude,
                    l[1].latitude
                ]),
                width: 5,
                material: Color.RED,
                clampToGround: true
            }
        });
    }
}
// 绘制剖面线 echarts
function drawChart(pointArr: any[]) {
    let heightArr = pointArr.map(p => p.height);
    let lonlatArr = pointArr.map((p, index) => index);

    // 指定图表的配置项和数据
    let option = {
        title: {
            text: '地质剖面图',
            textStyle: {
                color: '#2e7d6a'
            },
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                params = params[0];
                let index = params.dataIndex;
                let p = pointArr[index];
                return `位置：${p.longitude},${p.latitude}<br/>高程：${p.height}`;
            },
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            }
        },
        toolbox: {
            feature: {
                saveAsImage: {}
            }
        },
        grid: {
            left: '3%',
            right: '60px',
            bottom: '3%',
            containLabel: true
        },

        xAxis: [
            {
                type: 'category',
                boundaryGap: false,
                data: lonlatArr,
                name: '位置'
            }
        ],
        yAxis: [
            {
                type: 'value',
                name: '高程(m)'
            }
        ],
        series: [
            {
                name: '高程',
                type: 'line',
                stack: 'Total',
                areaStyle: {},
                emphasis: {
                    focus: 'series'
                },
                data: heightArr
            }
        ]
    };
    myChart = echarts.init(chartRef.value);
    myChart.setOption(option);
    // if (!ChartResize) {
    //     ChartResize = () => myChart.resize();
    //     window.addEventListener('resize', ChartResize);
    // }
}
// 清除剖面线 echarts
function clearChart() {
    if (myChart) {
        myChart.clear();
        myChart.dispose();
        window.removeEventListener('resize', ChartResize);
        ChartResize = null;
        myChart = null;

        redLine && earth.viewer3D.entities.remove(redLine);
        redLine = null;

        startPoint.value = null;
        endPoint.value = null;
    }
}
function close() {
    ceStore.setCesiumEarthComAction('geologicalSection', 2)
}

</script>

<style lang="scss" scoped>
#msPane {
    button {
        margin: 5px 2px;
    }
}


.chart {
    display: inline-block;
    width: 100%;
    height: 200px;
    margin-top: 20px;
}
</style>
