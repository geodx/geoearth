<template>
	<div v-if="show" class="layer">
		<div class="tool-title">
			<div>
				<img alt="" src="./img/layer.png" />
				<span>地图数据</span>
			</div>
			<img alt="" class="close-btn" src="./img/close.png" @click="close" />
		</div>
		<div class="layer-tree">
			<!-- 加载数据图层 -->
			<!-- <div id="treeDom" class="ztree" style="padding: 5px 10px"></div> -->
			<el-tree ref="treeRef" :data="treeData" node-key="id" show-checkbox :check-on-click-node="false"
				:expand-on-click-node="false" :props="treeProps" @check="handleCheck">
				<template #default="{ node, data }">
					<div class="tree-node">
						<!-- 父节点 -->
						<img v-if="data.isFolder" :src="node.expanded ? folderOpenIcon : folderCloseIcon"
							class="node-icon" />

						<!-- 子节点 -->
						<img v-else-if="data.icon" :src="data.icon" class="node-icon" />
						<span class="node-label" :class="{ active: data.checked }" @click.stop="onLabelClick(data)">
							{{ data.label }}
						</span>
					</div>
				</template>
			</el-tree>

			<div id="ctrlTree" :class="{ openLoad: isReloadTree, closeLoad: !isReloadTree }" @click="toggleReload">
				<span style="padding-right: 10px">实时数据接入</span>
				<el-text v-if="isReloadTree" size="small" :type="isReloadTree ? 'success' : 'warning'"
					style="font-size: 14px">◉ 开启中
				</el-text>
				<el-text v-if="!isReloadTree" size="small" :type="isReloadTree ? 'success' : 'warning'"
					style="font-size: 14px">◉
					已关闭
				</el-text>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useEarthStore } from '@/stores/EarthStore'
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore'
import { ConfigTool } from '@/lib/CesiumEarth/ts/Config/ConfigTool'
import type { ResourceItem } from '@/lib/CesiumEarth/ts/Config/ResourceItem'

import type { ElTree } from 'element-plus'
import { EventManage, ListenType, ScopeType } from '@/lib/CesiumEarth/ts/EventManage'
import type { WorkSpace } from '@/lib/CesiumEarth/ts/WorkSpace'
import type { Earth } from '@/lib/CesiumEarth/ts/Earth'
import { DataTypeEnum } from '@/lib/CesiumEarth/ts/Config/Enum/DataTypeEnum'
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()

const isReloadTree = ref(false)
let reloadTimer: number
let earth: Earth

const treeRef = ref<InstanceType<typeof ElTree>>()
type TreeNode = {
	id: string
	label: string
	checked?: boolean
	children?: TreeNode[]
	resource?: ResourceItem
	isLeaf?: boolean,
	icon?: string
}
const treeData = ref<TreeNode[]>([])
const treeProps = {
	label: 'label',
	children: 'children',
}
let workSpace: WorkSpace;
const folderCloseIcon = new URL('./img/tree/folder-close.png', import.meta.url).href
const folderOpenIcon = new URL('./img/tree/folder-open.png', import.meta.url).href
const show = computed(() => {
	return ceStore.comStatus('resourceTree')
})
onMounted(async () => {
	earth = await earthStore.getEarth()
})
onUnmounted(() => {
	stopReloadTimer()
})
watch(show, async (visible: any) => {
	if (!earth) return
	workSpace = earth.viewer3DWorkSpace
	if (visible) {
		refreshTree()
		// initEvent()
		startReloadTimer()
	} else {
		stopReloadTimer()
	}
},
	{ immediate: true },
)
// 初始化资源 【载入、移除】事件
function initEvent() {
	EventManage.sourceEvent.addEventListener(ListenType.DataEventType.addData, ScopeType.Viewer3D, refreshTree);
	EventManage.sourceEvent.addEventListener(ListenType.DataEventType.removeData, ScopeType.Viewer3D, refreshTree);
	EventManage.sourceEvent.addEventListener(ListenType.DataEventType.changedData, ScopeType.Viewer3D, refreshTree);
}
function startReloadTimer() {
	stopReloadTimer()
	reloadTimer = window.setInterval(async () => {
		await reloadTree()
	}, 2000)
}
function stopReloadTimer() {
	if (reloadTimer) {
		clearInterval(reloadTimer)
		reloadTimer = -1
	}
}

function close() {
	ceStore.setCesiumEarthComAction('resourceTree', 2)
}

function refreshTree() {
	treeData.value = buildTreeData()
	syncCheckedKeys()
}

function syncCheckedKeys() {
	const keys = collectCheckedKeys(treeData.value)
	nextTick(() => {
		// 确保树节点选中操作是在视图更新之后进行
		treeRef.value?.setCheckedKeys(keys);
	});
}

function collectCheckedKeys(nodes: TreeNode[]): string[] {
	const keys: string[] = []

	function walk(list: TreeNode[]) {
		list.forEach((node) => {
			if (node.checked) {
				keys.push(node.id)
			}
			if (node.children?.length) {
				walk(node.children)
			}
		})
	}

	walk(nodes)
	return keys
}

function buildTreeData(): TreeNode[] {
	// 获取配置文件中全部的资源
	let sourceLists: ResourceItem[] = ConfigTool.getAllSources()
	// 过滤掉不需要在树图上显示的资源项
	sourceLists = sourceLists.filter((item: any) => item.showInTree);
	const catalogMap = new Map<string, TreeNode[]>()
	for (const item of sourceLists) {
		const catalogName = item.catalog || '未分类'
		if (!catalogMap.has(catalogName)) {
			catalogMap.set(catalogName, [])
		}

		catalogMap.get(catalogName)!.push({
			id: item.pid,
			label: item.name,
			icon: getTreeIcon(item.dataType),
			checked: item.show,
			resource: item,
			isLeaf: true,
		})
	}
	const sortCatalogs = Array.from(catalogMap.keys()).sort((a, b) => {
		const priority = ['基础影像', '电子地图', '地形图层', '实时数据']
		const ai = priority.indexOf(a)
		const bi = priority.indexOf(b)

		if (ai !== -1 && bi !== -1) return ai - bi
		if (ai !== -1) return -1
		if (bi !== -1) return 1
		return a.localeCompare(b, 'zh-CN')
	})

	return sortCatalogs.map((catalogName) => ({
		id: `catalog_${catalogName}`,
		label: catalogName,
		children: catalogMap.get(catalogName) || [],
		isFolder: true,
	}))
}
function getTreeIcon(dataType: string) {
	switch (dataType) {
		case DataTypeEnum.layer:
			return new URL('./img/tree/图层.png', import.meta.url).href
		case DataTypeEnum.terrain:
			return new URL('./img/tree/地形.png', import.meta.url).href
		case DataTypeEnum.Cesium3DTile:
			return new URL('./img/tree/倾斜摄影.png', import.meta.url).href
		case DataTypeEnum.gltf:
			return new URL('./img/tree/模型.png', import.meta.url).href
		case DataTypeEnum.poi:
			return new URL('./img/tree/点.png', import.meta.url).href
		case DataTypeEnum.geoJson:
			return new URL('./img/tree/geoJson.png', import.meta.url).href
		default:
			return ''
	}
}
function handleCheck(
	data: TreeNode,
	info: {
		checkedKeys: string[]
		checkedNodes: TreeNode[]
		halfCheckedKeys: string[]
		halfCheckedNodes: TreeNode[]
	},
) {
	treeData.value.forEach((item: TreeNode) => {
		if (!item.isLeaf || !item.resource) return
		const checked = info.checkedKeys.includes(item.id)
		if (checked) {
			workSpace.addData(item.resource).then()
			ConfigTool.setResourceParam(item.id, 'show', true)
		} else {
			workSpace.removeDataByPid(item.resource.pid)
			ConfigTool.setResourceParam(item.id, 'show', false)
		}
	});


	// refreshTree()
}

function onLabelClick(data: TreeNode) {
	if (!data.isLeaf || !data.resource) return
	earth.viewer3DWorkSpace.flyToDataByPid(data.resource.pid)
}
function toggleReload() {
	isReloadTree.value = !isReloadTree.value
	if (!isReloadTree.value) {
		ConfigTool.config.cesium3DTileSetList =
			(ConfigTool.config.cesium3DTileSetList || []).filter((item) => {
				return item.properties?.type !== 'realtime'
			})

		refreshTree()
	} else {
		reloadTree()
	}
}

async function reloadTree() {
	if (!isReloadTree.value) return

	const realTimeData = await fetch('http://127.0.0.1:3000/TileServer/getTileSetList').then((res) =>
		res.json(),
	)

	const configTileSetList = ConfigTool.config.cesium3DTileSetList || []

	const newItems = realTimeData.filter(
		(realTimeItem: ResourceItem) =>
			configTileSetList.find((item) => item.pid === realTimeItem.pid) === undefined,
	)

	const removedItems = configTileSetList.filter(
		(item: ResourceItem) =>
			item.properties?.type === 'realtime' &&
			realTimeData.find((realTimeItem: ResourceItem) => realTimeItem.pid === item.pid) ===
			undefined,
	)

	for (let i = 0; i < newItems.length; i++) {
		const item = newItems[i]
		const tileSet3D = {
			pid: item.pid,
			name: item.name,
			catalog: '实时数据',
			dataType: 'Cesium3DTile',
			show: false,
			properties: {
				type: 'realtime',
				url: 'http://127.0.0.1:3000' + item.url,
			},
		} as ResourceItem

		ConfigTool.addResourceItem(tileSet3D)
	}

	for (let j = 0; j < removedItems.length; j++) {
		const removedItem = removedItems[j]

		ConfigTool.config.cesium3DTileSetList =
			ConfigTool.config.cesium3DTileSetList.filter(
				(item) => item.pid !== removedItem.pid,
			)

		earth.viewer3DWorkSpace.removeDataByPid(removedItem.pid)
	}

	refreshTree()
}
</script>

<style lang="scss">
.layer {
	background: rgba(33, 45, 33, 0.8);
	position: absolute;
	min-width: 200px;
	border-radius: 5px;
	z-index: 100;
	top: calc(17vh + 20px);
	left: 38px;

	.layer-tree {
		width: 100%;
		height: 40vh;
		overflow: auto;
		padding-bottom: 50px;
		margin-top: 5px;
		margin-bottom: 5px;
	}
}

.tool-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 10px;
	font-size: 16px;
	font-weight: 400;
	color: #ffffff;
	line-height: 35px;
	border-bottom: 1px solid rgba(185, 197, 185, 0.2);

	img:first-child {
		margin-right: 0.5vw;
	}

	.close-btn {
		text-align: right;
		width: 20px;
		height: 20px;
		color: #fff;
		cursor: pointer;
	}
}

#ctrlTree {
	border-radius: 0 0 5px 5px;
	padding: 6px 15px;
	text-align: center;
	border-top: 1px solid rgba(185, 197, 185, 0.2);
	position: absolute;
	bottom: 0;
	width: 100%;
	color: whitesmoke;
	cursor: pointer;
}

.openLoad {
	background-color: rgba(168, 244, 103, 0.3);
}

.closeLoad {
	background-color: rgb(23, 30, 32);
}

.el-tree {
	background: transparent;
	--el-tree-node-hover-bg-color: transparent;

}

.el-checkbox {
	--el-checkbox-checked-bg-color: white;
	--el-checkbox-checked-icon-color: #67c23a;
	--el-checkbox-checked-input-border-color: rgb(23, 30, 32);
}

.el-checkbox__inner:after {
	border: 2px solid transparent;
	border-left: 0;
	border-top: 0;
}

// .el-text:hover {
// 	color: #66afe9;
// 	text-decoration: underline;
// }

.tree-node {
	display: flex;
	align-items: center;
	width: 100%;
	color: whitesmoke;
	font-size: 14px;

	.node-icon {
		width: 16px;
		height: 16px;
		margin-right: 6px;
		vertical-align: middle;
	}

	.node-label {
		flex: 1;
		padding: 2px 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		border-radius: 3px;
	}

	.node-label:hover {
		// background: rgba(102, 175, 233, 0.2);
		text-decoration: underline;
	}

	.node-label.active {
		color: #67c23a;
	}

}
</style>
