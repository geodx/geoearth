<template>
    <div id="container" class="demo-map"></div>
   
    <div style="position: absolute; top: 180px; right: 10px; background: rgba(0, 0, 0, 0.7); ">
        FPS: {{ fps }}
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { GeoEarth } from 'geoearth'

let earth: GeoEarth | undefined
const fps = ref<number>(0)
onMounted(() => {
    let start = performance.now()
    earth = new GeoEarth('container')
    console.log(`[Basic] new GeoEarth: ${(performance.now() - start).toFixed(2)} ms`)

    init()

})

onBeforeUnmount(() => {
    earth?.destroy()
    earth = undefined
})
function init() {
    let start = performance.now()
    earth?.ready.then(() => {
        console.log(`[Basic] earth.ready: ${(performance.now() - start).toFixed(2)} ms`) 
        
    })

    setInterval(() => {
        const value = earth?.performance.getFPS() ?? 0
        fps.value = value > 0 ? value : 0
    }, 1000)


}
</script>
<style lang="scss">
.overview-container {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 10;
    width: 280px;
    height: 180px;
    overflow: hidden;
    border: 1px solid rgb(87 180 255 / 70%);
    border-radius: 4px;
    box-shadow: 0 6px 24px rgb(0 0 0 / 45%);
}
</style>
