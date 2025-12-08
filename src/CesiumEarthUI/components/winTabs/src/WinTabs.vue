<template>
	<Vue3DraggableResizable v-show="ready" ref="tab" v-model:active="active" v-model:h="h" v-model:parent="parent"
		v-model:w="w" v-model:x="x" v-model:y="y" :draggable="true" :initH="250" :initW="300" :minH="123" :minW="300"
		:resizable="resizable" class="winTabs" classNameActive="classNameActive" @activated="print('activated')"
		@deactivated="print('deactivated')" @dragging="print('dragging')" @resizing="print('resizing')"
		@drag-start="print('drag-start')" @resize-start="print('resize-start')" @drag-end="print('drag-end')"
		@resize-end="print('resize-end')">
		<div ref="content" class="content">
			<div class="iconBtnGroup">
				<span v-if="changeSizeAble" class="iconBtn noDrag iconfont icon-esgcc-fuzhi" style="right: 20px"
					@click="changeSize"></span>
				<span v-if="maxAble" class="iconBtn noDrag iconfont icon-esgcc--zuidahua" style="right: 40px"
					@click="zoomSize"></span>
				<span class="iconBtn noDrag iconfont icon-esgcc-tishi" title="帮助教程" @click="openHelp"></span>
				<span class="iconBtn noDrag iconfont icon-esgcc-guanbi" style="right: 0" title="关闭"
					@click="close"></span>
			</div>

			<div v-if="false" class="help-block-win">
				<span>
					📋您第一次使用该模块，可以点击此处观看使用视频教程：
				</span>
				<div>
					<el-button type="success">打开教程</el-button>
					<el-button type="primary" @click="firstGuide = false">跳过</el-button>
				</div>
			</div>
			<el-tabs style="height: 100%;border-radius: 3px;padding:0 10px 5px 10px;">
				<div @mousedown.stop @touchstart.stop style="height: 100%">
					<slot></slot>
				</div>
			</el-tabs>
		</div>
	</Vue3DraggableResizable>
</template>

<script lang="ts" setup>
import Vue3DraggableResizable from 'vue3-draggable-resizable';
import { ElTabs } from 'element-plus';
import tabsStyle from './tabsStyle.json';
import { nextTick, onMounted, ref } from 'vue';
const ready = ref(false)
const x = ref(100)
const y = ref(100)
const h = ref(250)
const w = ref(300)
const active = ref(false)
const parent = ref(true)
const resizable = ref(false)
const content = ref();

const oldSize = { x: 100, y: 100, h: 250, w: 300 }
let winSize = 'min'
let fontColor = '#009c95'
let border = '1px solid #526f82'
let outBackgroundColor = 'rgba(38, 38, 38, 0.75)'
let inBackgroundColor = '#242524'

const props = defineProps(['initCSS', 'maxAble', 'changeSizeAble', 'firstGuide'])
const emit = defineEmits<{ openHelp: [], close: [] }>()
onMounted(() => {
	fontColor = tabsStyle.fontColor;
	border = tabsStyle.border;
	outBackgroundColor = tabsStyle.outBackgroundColor;
	inBackgroundColor = tabsStyle.inBackgroundColor;
	const styleCss = props.initCSS;
	for (const key in styleCss) {
		if (key === 'height') {
			h.value = styleCss[key];
		} else if (key === 'width') {
			w.value = styleCss[key];
		} else if (key === 'left') {
			x.value = styleCss[key];
		} else if (key === 'top') {
			y.value = styleCss[key];
		}
	}

	content.value.style.borderStyle = tabsStyle.border;
	content.value.style.backgroundColor = tabsStyle.outBackgroundColor;
	content.value.getElementsByClassName('el-tabs__content')[0].style.backgroundColor = tabsStyle.inBackgroundColor;
	ready.value = true;

})
function print(val: string) {
	if (val === 'resize-end') {
		resizable.value = false;
	}
}
function changeSize() {
	resizable.value = !resizable.value;
}
function zoomSize() {
	winSize = winSize === 'min' ? 'max' : 'min';
	if (winSize === 'min') {
		h.value = oldSize.h;
		w.value = oldSize.w;
		nextTick(() => {
			x.value = oldSize.x;
			y.value = oldSize.y;
		})
	} else {
		oldSize.x = x.value;
		oldSize.y = y.value;
		oldSize.h = h.value;
		oldSize.w = w.value;
		x.value = 0;
		y.value = 0;
		h.value = document.documentElement.clientHeight;
		w.value = document.documentElement.clientWidth;
	}

}

function openHelp() {
	emit('openHelp');

}
function close() {
	emit('close');
}


</script>

<style lang="scss" scoped>
@import "./iconBtn.css";

.winTabs {
	z-index: 100;
	height: 100%;
	width: 100%;
}

.content {
	height: 100%;
	width: 100%;
	position: relative;
	border: 1px solid #526f82;
	border-radius: 5px;
}

.help-block-win {
	width: 100%;
	height: 100%;
	position: absolute;
	z-index: 5;
	background-color: rgba(33, 45, 33, 0.9);
	color: #fad9a4;
	padding: 50px 20px 20px 20px;
	font-size: 16px;
	border-radius: 5px;
	display: flex;
	flex-direction: column;

	div {
		padding-top: 20px;
		text-align: center;
	}
}

.classNameActive {
	border-color: #526f82;
	border-radius: 5px;
}

:deep(.el-tabs__item) {
	color: #c9c9c9;
}

:deep(.el-tabs__item.is-active) {
	color: #009c95;
}

:deep(.el-tabs__nav-wrap::after) {
	background-color: #2b2d2b;
}

:deep(.el-tabs__active-bar) {
	background-color: #009c95;
}

:deep(.el-tabs__content) {
	height: calc(100% - 65px);
	padding: 10px;
	color: #009c95;
	overflow: auto;

	input[type=text] {
		color: black;
	}

	select {
		color: black;
	}
}
</style>
