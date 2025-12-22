/****************************************************************************
名称：量测工具的逻辑处理
最后修改日期：2022-04-20
****************************************************************************/

<template>
	<win-tabs :initCSS="{ width: 350, height: 180, left: 400, top: 300 }" @close="close">
		<tab-pane label="量测工具">
			<div id="measurePane" style="text-align: center">
				<button class="btn btn-sm btn-success" type="button" @click="measureHeight">测高程</button>
				<button class="btn btn-sm btn-success" type="button" @click="verticalDistance">测高差</button>
				<button class="btn btn-sm btn-success" type="button" @click="spaceDistance">测距离</button>
				<button class="btn btn-sm btn-success" type="button" @click="surfaceArea">测面积</button>
				<button class="btn btn-sm btn-success" type="button" @click="measureTriangle">测角度</button>
				<button class="btn btn-sm btn-success" type="button" @click="perimeter">测周长</button>
				<button v-show="false" class="btn btn-sm btn-success" type="button" @click="surfaceArea">三角测量
				</button>
				<button class="btn btn-sm btn-danger" type="button" @click="stopMeasure">结束绘制</button>
				<button class="btn btn-sm btn-warning" type="button" @click="removeAll">重置</button>
			</div>
		</tab-pane>
	</win-tabs>
</template>

<script setup lang="ts">
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { TabPane, WinTabs } from '../../winTabs'
import { onMounted, onUnmounted } from 'vue';
import { useEarthStore } from '@/stores/EarthStore';
import type { MeasureTool } from '@/lib/CesiumEarth/ts/MeasureTool';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()

let measureTool: MeasureTool;
onMounted(async () => {
	const earth = await earthStore.getEarth()
	measureTool = earth.measureTool;
})
onUnmounted(() => {
	measureTool.removeAll();
})

// 测高程
function measureHeight() {
	measureTool.measureHeight();
}
// 垂直距离
function verticalDistance() {
	measureTool.verticalDistance();
}
// 三角量距离
function CesiumTriangle() {

}
// 空间距离
function spaceDistance() {
	measureTool.spaceDistance();
}
// 空间面积
function surfaceArea() {
	measureTool.surfaceArea();
}
// 角度测量
function measureTriangle() {
	measureTool.measureTriangle();
}
// 周长测量
function perimeter() {
	measureTool.perimeter();
}
function stopMeasure() {
	measureTool.stopMeasure();
}
// 重置
function removeAll() {
	measureTool.removeAll();
}
function close() {
	ceStore.setCesiumEarthComAction('measureTool', 2)
}

</script>

<style lang="scss" scoped>
#measurePane {
	button {
		margin: 5px 2px;
		width: 70px;
	}
}
</style>
