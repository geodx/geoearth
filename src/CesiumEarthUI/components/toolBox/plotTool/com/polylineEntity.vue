<template>
	<div>
		<div style="padding-top: 15px">
			材质：
			<el-select v-model="lineMaterialIndex" clearable placeholder="请选择" size="small" style="width: 215px"
				@change="changeSymbol">
				<el-option v-for="(item, index) in lineMaterials" :key="index" :label="item.label" :value="index">
					<span style="float: left">{{ item.label }}</span>
					<span v-if="item.url" style="float: right;">
						<img :src="item.url" height="10" width="100" />
					</span>
				</el-option>
			</el-select>
		</div>

		<div style="padding-top: 15px">
			线宽：
			<el-input v-model.number="lineMaterialWidth" size="small" style="width: 80px"></el-input>
		</div>

	</div>
</template>

<script lang="ts" setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';
const emit = defineEmits(['setDrawObj'])
const lineMaterialIndex = ref(0)
const lineMaterialWidth = ref(12)
const lineMaterials = ref()
onMounted(async () => {
	const { data: plotList } = await axios.get('./CesiumEarth/Config/plotTool/lineEntity/plotList.json');
	lineMaterials.value = plotList;
	changeSymbol();
})
function changeSymbol() {
	let polylineItem = lineMaterials.value[lineMaterialIndex.value];
	if (polylineItem) {
		emit('setDrawObj',
			{
				type: 'polylineEntity',
				params: {
					material: polylineItem.type,
					width: lineMaterialWidth,
					type: '线要数'
				}
			}
		);
	}
}

</script>

<style lang="scss" scoped></style>
