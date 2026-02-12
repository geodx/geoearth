<template>
	<div style="padding-top: 15px">
		材质：
		<el-select v-model="pointMaterialIndex" clearable placeholder="请选择" size="small" style="width: 215px"
			@change="changeSymbol">
			<el-option v-for="(item, index) in pointMaterials" :key="item.label" :label="item.label" :value="index">
				<span style="float: left">{{ item.label }}</span>
				<span style="float: right;">
					<img :src="item.symbolUrl" alt="符号" height="24" width="24" />
				</span>
			</el-option>

			<template #label="{ label }">
				<img :src="getSymbolImg()" alt="符号" height="20" width="20" style="margin-right: 8px" />
				<span>{{ label }}: </span>
			</template>
		</el-select>
	</div>
</template>

<script lang="ts" setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';
const emit = defineEmits(['setDrawObj'])
const pointMaterialIndex = ref(0)
const pointMaterials = ref()
onMounted(async () => {
	const { data: plotList } = await axios.get('CesiumEarth/plotTool/pointEntity/plotList.json');
	pointMaterials.value = plotList;
	changeSymbol();
})
function getSymbolImg() {
	if (!pointMaterials.value) return ''
	const pointItem = pointMaterials.value[pointMaterialIndex.value];
	return pointItem?.symbolUrl;
}
function changeSymbol() {
	const pointItem = pointMaterials.value[pointMaterialIndex.value];
	if (pointItem) {
		emit('setDrawObj',
			{
				type: 'pointEntity',
				name: pointItem.label,
				label: pointItem.label,
				symbolUrl: pointItem.symbolUrl
			}
		);
	}
}

</script>

<style lang="scss" scoped>
img {
	vertical-align: middle;
	border: 0;
}
</style>
