<template>
	<div>
		<div>
			<el-button size="small" :type="continuous ? 'success' : ''"
				@click="continuous = !continuous">连续标注</el-button>
			<el-text type="info" v-if="continuous === false" style="margin-left: 10px">：未开启</el-text>
			<el-text type="success" v-if="continuous === true" style="margin-left: 10px">：开启</el-text>
		</div>
		<div style="margin-top: 20px">
			<el-button size="small" type="primary" @click="addMarkLabel">标注</el-button>
			<el-button size="small" type="success" @click="exportMarkers">导出</el-button>
			<el-button size="small" type="warning" @click="removeMarkLabel">重置</el-button>
		</div>
	</div>
</template>


<script setup lang="ts">
import CesiumEarth from '@/lib/CesiumEarth';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { useEarthStore } from '@/stores/EarthStore';
import { Cartesian3 } from 'cesium';
import { onMounted, onUnmounted, ref } from 'vue';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()


const continuous = ref(false)

let dynamicLabelList: any[] = [];
let pointList: any[] = [];

let earth: CesiumEarth.Earth
onMounted(async () => {
	earth = await earthStore.getEarth()
	dynamicLabelList = [];
	pointList = [];
})

onUnmounted(() => {
	removeMarkLabel()
})

function saveShareContent(content: any, fileName: string) {
	const downLink = document.createElement('a');
	downLink.download = fileName;
	//字符内容转换为blod地址
	const blob = new Blob([content]);
	downLink.href = URL.createObjectURL(blob);
	// 链接插入到页面
	document.body.appendChild(downLink);
	downLink.click();
	// 移除下载链接
	document.body.removeChild(downLink);
}

async function addMarkLabel() {
	earth.drawShape.drawPoint({
		endCallback: async (positions: Cartesian3[]) => {

			const position = CesiumEarth.CartographicTool.formCartesian3(positions[0]!);
			const [cartesianHasHeight] = await CesiumEarth.getMostDetailedHeight(earth.viewer3D, [{
				longitude: position.longitude,
				latitude: position.latitude,
				height: 0
			}]);

			const height = cartesianHasHeight!.height;

			const lon = position.longitude;
			const lat = position.latitude;

			const dom = document.createElement('div');
			dom.innerHTML = `<div style="text-align: left">
			          <div>经度：${lon.toFixed(5)}°</div>
			          <div>纬度：${lat.toFixed(5)}°</div>
			          <div>高程：${height?.toFixed(4)} m</div>
			      </div>`;

			const point = new CesiumEarth.SuperiorEntity.GradientLabelPoint(
				earth.viewer3D,
				{ longitude: lon, latitude: lat, height: height },
				dom,
				true
			);
			point.init();

			dynamicLabelList.push(point);
			pointList.push({ lon: lon, lat: lat, height: height });
			if (continuous.value) {
				await addMarkLabel();
			}
		}
	});
}
function exportMarkers() {
	saveShareContent(JSON.stringify(pointList, null, 2), '坐标标注.json');
}
function removeMarkLabel() {
	dynamicLabelList.forEach(e => {
		e.remove();
	});
	dynamicLabelList = [];
	pointList = [];

	continuous.value = false;
	earth.drawShape.callStop();
}

</script>
