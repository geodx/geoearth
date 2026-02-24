/****************************************************************************
名称：标绘工具
最后修改日期：2022-05-28
****************************************************************************/
<template>
	<win-tabs v-if="show" :initCSS="{ width: 340, height: 585, left: 1330, top: 130 }" @close="close">
		<tab-pane label="标绘工具">
			<ed-content></ed-content>
		</tab-pane>
		<tab-pane :lazy="true" label="实体管理">
			<EntityAttr></EntityAttr>
		</tab-pane>
		<tab-pane :lazy="true" label="导出">
			<export-plot></export-plot>
		</tab-pane>
	</win-tabs>
</template>
<script lang="ts" setup>
import EdContent from './EdContent.vue';
import ExportPlot from './com/exportPlot.vue';
import EntityAttr from './com/entityAttr.vue';
import { TabPane, WinTabs } from '../../winTabs'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { computed } from 'vue';
const ceStore = useCesiumEarthStore()
function close() {
	ceStore.setCesiumEarthComAction('plotTool', 2)
}
const show = computed(() => ceStore.comStatus('plotTool')) 
</script>