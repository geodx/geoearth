<template>
    <div id="container" class="demo-map"></div>
    <button @click="measureHeight" style="position: absolute; top: 180px; right: 10px; ">
        高程
    </button>
</template>

<script setup lang="ts">
import { DrawCancelledError, GeoEarth, MeasureCancelledError } from 'geoearth'
import { onBeforeUnmount, onMounted } from 'vue'

let earth: GeoEarth | undefined
onMounted(() => {
    earth = new GeoEarth(
        'container',
        undefined,
        { startup: { showFps: true, animation: false } })
})

onBeforeUnmount(() => {
    earth?.destroy()
    earth = undefined
})
async function measureHeight() {
    try {
        if (!earth) return
        const result = await earth?.tools.measure.measureHeight()

        console.log('经度：', result.longitude)
        console.log('纬度：', result.latitude)
        console.log('高程：', result.height)
        console.log('数据来源：', result.source)
    } catch (error) {
        if (error instanceof MeasureCancelledError || error instanceof DrawCancelledError) {
            console.log('取消测量')
        } else {
            console.error(error)
        }
    }


}
</script>
