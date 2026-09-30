<template>
    <div id="container" class="demo-map"></div>

    <div class="draw-toolbar">
        <button :disabled="drawing" @click="drawPoint">
            画点
        </button>

        <button :disabled="drawing" @click="drawLine">
            画线
        </button>

        <button :disabled="!drawing" @click="cancelDrawing">
            取消
        </button>

        <button :disabled="drawing" @click="clearResults">
            清除
        </button>

        <span class="draw-status">{{ status }}</span>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CoordinateType, DrawCancelledError, GeoEarth, PolylineGlowMaterial, type DegreePosition } from 'geoearth'
import { Cartesian3, Color, CustomDataSource } from 'cesium'
 

let earth: GeoEarth | undefined
let resultDataSource: CustomDataSource | undefined

const drawing = ref(false)
const status = ref('就绪')

onMounted(() => {
    earth = new GeoEarth('container', undefined, {
        startup: {
            showFps: true,
            animation: false
        }
    })

    resultDataSource = new CustomDataSource('draw-test-results')
    void earth.viewer.dataSources.add(resultDataSource)
})

onBeforeUnmount(() => {
    earth?.destroy()

    resultDataSource = undefined
    earth = undefined
})

async function drawPoint(): Promise<void> {
    if (!earth || !resultDataSource || drawing.value) return

    drawing.value = true
    status.value = '正在绘制点'

    try {
        const position = await earth.tools.draw.drawPoint({
            coordinateType: CoordinateType.DEGREES,
            onMove(position) {
                status.value = formatPosition(position)
            }
        })

        resultDataSource.entities.add({
            position: toCartesian(position),
            point: {
                pixelSize: 10,
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        })

        status.value = `点：${formatPosition(position)}`
    } catch (error) {
        handleDrawError(error)
    } finally {
        drawing.value = false
    }
}

async function drawLine(): Promise<void> {
    if (!earth || !resultDataSource || drawing.value) return

    drawing.value = true
    status.value = '左键添加节点，右键完成'

    try {
        const positions = await earth.tools.draw.drawLine({
            coordinateType: CoordinateType.DEGREES,
            width: 4,
            color: Color.CYAN,
            showVertex: true,
            onMove(positions) {
                status.value = `当前节点：${positions.length}`
            }
        })
 
        resultDataSource.entities.add({
            polyline: {
                positions: positions.map(toCartesian),
                width: 8, 
                material: new PolylineGlowMaterial({
                    color: Color.CYAN,  
                })
            }
        })

        status.value = `画线完成，共 ${positions.length} 个节点`
    } catch (error) {
        handleDrawError(error)
    } finally {
        drawing.value = false
    }
}

function cancelDrawing(): void {
    if (!earth || !drawing.value) return

    earth.tools.draw.cancel()
}

function clearResults(): void {
    resultDataSource?.entities.removeAll()
    status.value = '已清除'
}

function handleDrawError(error: unknown): void {
    if (error instanceof DrawCancelledError) {
        status.value = '已取消'
        return
    }

    status.value = '绘制失败'
    console.error('绘制异常：', error)
}

function toCartesian(position: DegreePosition): Cartesian3 {
    return Cartesian3.fromDegrees(position.longitude, position.latitude, position.height)
}

function formatPosition(position: DegreePosition): string {
    const longitude = position.longitude.toFixed(6)
    const latitude = position.latitude.toFixed(6)
    const height = position.height.toFixed(2)

    return `${longitude}, ${latitude}, ${height} m`
}
</script>

<style scoped>
.demo-map {
    width: 100%;
    height: 100%;
}

.draw-toolbar {
    position: absolute;
    top: 85px;
    left: 300px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 8px;
    color: #e9f3ff;
    background: rgb(10 18 28 / 88%);
    border: 1px solid rgb(79 159 255 / 45%);
    border-radius: 6px; 
    backdrop-filter: blur(8px);
}

.draw-toolbar button {
    min-width: 64px;
    height: 32px;
    padding: 0 14px;
    color: #e9f3ff;
    cursor: pointer;
    background: #173149;
    border: 1px solid #3479aa;
    border-radius: 4px;
}

.draw-toolbar button:hover:not(:disabled) {
    background: #205074;
    border-color: #55b8f2;
}

.draw-toolbar button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.draw-status {
    min-width: 210px;
    padding: 0 8px;
    font-size: 13px;
    white-space: nowrap;
}
</style>
