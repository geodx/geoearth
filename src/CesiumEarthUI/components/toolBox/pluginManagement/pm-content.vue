<template>
    <win-tabs :initCSS="{ width: 150, height: 500, left: 900, top: 30 }" @close="close">
        <tab-pane label="插件管理">
            <ul>
                <li v-for="item in tool" :key="item.id" :style=hideSelf(item) class="liBox">
                    <label class="label-container" style="color:white;">{{
                        item.name
                    }}</label>
                    <el-switch v-model="item.config.inToolBox" active-color="#13ce66" inactive-color="#929090"
                        @change="change(item.comName, item.config.inToolBox)"></el-switch>
                </li>
            </ul>
        </tab-pane>
    </win-tabs>
</template>
<script setup lang="ts">
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { TabPane, WinTabs } from '../../winTabs'
import { ref, computed, watch } from 'vue';
const ceStore = useCesiumEarthStore()
interface Tool {
    id: string
    config: any
    comName: string
    name: string
}
const tool = ref<Tool[]>([])
const comActions = computed(() => {
    return ceStore.comActions.filter(item =>
        item.type === 'ToolBoxItem'
    );
})
watch(() => comActions.value, (val: any) => {
    tool.value = val;
})
function change(comName: string, show: any) {
    ceStore.setItemInTool({ comName, show })
}
function close() {
    ceStore.setCesiumEarthComAction('PluginManagement', 2)
}
function hideSelf(item: Tool) {
    if (item.comName === 'PluginManagement') {
        return { display: 'none' };
    } else {
        return {};
    }
}

</script>
<style lang="scss" scoped>
.liBox {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: center;
}

::v-deep(.el-switch .el-switch__core) {
    width: 30px !important;
    height: 15px;
}

::v-deep(.el-switch .el-switch__core::after) {
    width: 14px;
    height: 14px;
    margin-top: -1px;
    margin-bottom: 2px;
}
</style>
