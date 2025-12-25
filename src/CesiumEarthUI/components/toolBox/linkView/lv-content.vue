<template>
    <win-tabs :initCSS="{ width: 400, height: 190, left: 800, top: 140 }" @close="close">
        <tab-pane label="视图联动">
            <!-- <div style="display: flex;justify-content: space-between;">
                <label class="label-container">二三维联动（电子底图）：</label>
                <el-switch v-model="OLMapLink23dIsOpen" active-color="#13ce66" inactive-color="#929090"></el-switch>
            </div> -->
            <div style="display: flex;justify-content: space-between;">
                <label class="label-container">二三维联动（卫星底图）：</label>
                <el-switch v-model="CesiumMapLink23dIsOpen" active-color="#13ce66" inactive-color="#929090"></el-switch>
            </div>
            <div style="display: flex;justify-content: space-between;">
                <label class="label-container">鹰眼视图（电子底图）：</label>
                <el-switch v-model="overViewMapIsOpen" active-color="#13ce66" inactive-color="#929090"></el-switch>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { useEarthStore } from '@/stores/EarthStore'
import { TabPane, WinTabs } from '../../winTabs'
import { ref, onMounted, watch } from 'vue'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore'
import type CesiumEarth from '@/lib/CesiumEarth'
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()

// const OLMapLink23dIsOpen = ref(false)
const CesiumMapLink23dIsOpen = ref(false)
const overViewMapIsOpen = ref(false)
let earth: CesiumEarth.Earth

onMounted(async () => {
    earth = await earthStore.getEarth()
    // OLMapLink23dIsOpen.value = sessionStorage.getItem('OLMapLink23dIsOpen') === 'true';
    CesiumMapLink23dIsOpen.value = sessionStorage.getItem('CesiumMapLink23dIsOpen') === 'true';
    overViewMapIsOpen.value = sessionStorage.getItem('overViewMapIsOpen') === 'true';
})
// watch(() => OLMapLink23dIsOpen.value, (val) => {
//     if (val) {
//         earth.openOLMapLink23d();
//     } else {
//         earth.closeOLMapLink23d();
//     }
//     sessionStorage.setItem('OLMapLink23dIsOpen', JSON.stringify(val));
// })
watch(() => CesiumMapLink23dIsOpen.value, (val) => {
    if (val) {
        earth.openMapLink23d();
    } else {
        earth.closeMapLink23d();
    }
    sessionStorage.setItem('CesiumMapLink23dIsOpen', JSON.stringify(val));
})
watch(() => overViewMapIsOpen.value, (val) => {
    if (val) {
        earth.openOverviewMap();
    } else {
        earth.closeOverviewMap();
    }
    sessionStorage.setItem('overViewMapIsOpen', JSON.stringify(val));
})


function close() {
    ceStore.setCesiumEarthComAction('linkView', 2)
}

</script>
