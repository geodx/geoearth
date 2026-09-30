<template>
    <div id="container" class="demo-map"></div>

</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { GeoEarth } from 'geoearth'

let earth: GeoEarth | undefined
onMounted(() => {
    earth = new GeoEarth('container', undefined, {
        startup: {
            showFps: true,
            animation: false
        }
    })

    // earth.widgets.overview.open()

})

onBeforeUnmount(() => {
    earth?.destroy()
    earth = undefined
})

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
