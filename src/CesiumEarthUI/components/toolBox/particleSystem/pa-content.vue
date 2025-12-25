<template>
    <win-tabs :initCSS="{ width: 300, height: 290, left: 350, top: 380 }" @close="close">
        <tab-pane label="粒子系统">
            <div style="text-align: center">
                <div class="toolRow">
                    <button class="btn btn-sm btn-success" style="margin-right: 10px;" type="button"
                        @click="toggleActive('firePlot')">火焰粒子</button>
                    <button class="btn btn-sm btn-success" style="margin-right: 10px;" type="button"
                        @click="toggleActive('fountainPlot')">喷泉粒子</button>
                    <button class="btn btn-sm btn-success" type="button"
                        @click="toggleActive('smokePlot')">烟雾粒子</button>
                </div>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { TabPane, WinTabs } from '../../winTabs'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore'
const ceStore = useCesiumEarthStore()

function toggleActive(comName: any) {
    ceStore.setCesiumEarthComAction(comName, 3)
}
function close() {
    ceStore.setCesiumEarthComAction('particleSystem', 2)
}
</script>

<style lang="scss" scoped>
.toolRow {
    text-align: center;
    margin-bottom: 5px;
}
</style>
