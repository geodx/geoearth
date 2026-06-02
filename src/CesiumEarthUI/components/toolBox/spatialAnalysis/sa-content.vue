<template>
    <win-tabs :initCSS="{ width: 300, height: 290, left: 350, top: 380 }" @close="close">
        <tab-pane label="空间分析">
            <div style="text-align: center">
                <div class="toolRow">
                    <el-button size="small" type="success" style="margin-right: 10px;"
                        @click="toggleActive('surfaceExcavateAnalysis')">地形开挖</el-button>
                    <el-button size="small" type="success" style="margin-right: 10px;"
                        @click="toggleActive('heightLimitAnalysis')">限高分析</el-button>
                    <el-button size="small" type="success" @click="toggleActive('slopeAnalysis')">坡度分析</el-button>
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
    ceStore.setCesiumEarthComAction('spatialAnalysis', 2)
}
</script>

<style lang="scss" scoped>
.toolRow {
    text-align: center;
    margin-bottom: 5px;
}
</style>
