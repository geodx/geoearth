<template>
	<div class="tabbable">
		<ul class="nav nav-tabs" v-if="false">
			<li><a v-if="false" data-toggle="tab" href="#tab2">实体属性</a></li>
			<li><a v-show="SelEntityID !== ''" id="a_tab3" data-toggle="tab" href="#tab3">几何编辑</a></li>
		</ul>
		<div class="tab-content">
			<div id="tab1" class="tab-pane active">
				<loadFile></loadFile>
				<div class="padding-top">
					标绘：
					<el-button-group size="small">
						<el-button @click="drawType = 'point'"
							:type="drawType === 'point' ? 'success' : 'default'">点</el-button>
						<el-button @click="drawType = 'polyline'"
							:type="drawType === 'polyline' ? 'success' : 'default'">线</el-button>
						<el-button @click="drawType = 'polygon'"
							:type="drawType === 'polygon' ? 'success' : 'default'">面</el-button>
						<el-button @click="drawType = 'custom'"
							:type="drawType === 'custom' ? 'success' : 'default'">自定义</el-button>
					</el-button-group>
				</div>

				<div style="min-height: 320px">
					<pointEntity v-if="drawType === 'point'" @setDrawObj="setDrawObj"></pointEntity>
					<polylineEntity v-if="drawType === 'polyline'" @setDrawObj="setDrawObj"></polylineEntity>
					<polygonEntity v-if="drawType === 'polygon'" @setDrawObj="setDrawObj"></polygonEntity>
					<customEntity v-if="drawType === 'custom'" @setDrawObj="setDrawObj"></customEntity>
					<div style="padding-top: 15px">
						带高：
						<el-switch v-model="featureHasHeight" size="small" style="width: 215px">
						</el-switch>
					</div>
					<div style="padding-top: 15px">
						连续标注：
						<el-button size="small" v-if="continuous === false" type="info"
							@click="continuous = !continuous">
							未开启
						</el-button>
						<el-button size="small" v-if="continuous === true" type="success"
							@click="continuous = !continuous"> 开启
						</el-button>
					</div>
				</div>

				<div class="padding-top">
					海拔高度：
					<label class="radio-inline">
						<input v-model="clampToGround" name="inlineRadioOptions" type="radio" value="false"
							@change="setClampToGround(true)" />
						贴近地表
					</label>
					<label class="radio-inline">
						<input v-model="clampToGround" name="inlineRadioOptions" type="radio" value="true"
							@change="setClampToGround(false)" />
						绝对高度
					</label>
				</div>

				<div id="ctrlBtn" class="padding-top">
					<el-button :disabled="!drawObj" size="small" type="success" @click="draw">绘制
					</el-button>
					<el-button size="small" type="primary" @click="analyticGeometry">结束绘制</el-button>
					<el-button size="small" type="warning" @click="cancel">撤销</el-button>
					<el-button size="small" type="danger" @click="removeAll">清空</el-button>
				</div>
			</div>
			<div id="tab3" class="tab-pane">
				<div style="padding: 15px">
					编辑：
					<button class="btn btn-info" type="button" @click="moveEntityNode">
						移动端点
					</button>
					<button v-show="SelEntityType !== 'Point'" class="btn btn-success" type="button"
						@click="moveEntityAll">
						平移整体
					</button>
				</div>

				<div style="padding: 15px">
					操作：
					<button class="btn btn-danger" type="button" @click="delEntity">
						删除
					</button>
					<button class="btn btn-danger" type="button" @click="unPick">
						关闭
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import buildVirtualPoint from './lib/buildVirtualPoint';
import imgUrl2Base64 from './lib/imgUrl2Base64';
import ExportPlot from './com/exportPlot.vue';
import LoadFile from './com/loadFile.vue';
import PointEntity from './com/pointEntity.vue';
import PolylineEntity from './com/polylineEntity.vue';
import PolygonEntity from './com/polygonEntity.vue';
import CustomEntity from './com/customEntity.vue';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useEarthStore } from '@/stores/EarthStore';
import CesiumEarth from '@/lib/CesiumEarth';
import { ScreenSpaceEventHandler, ScreenSpaceEventType, defined, Math, Cartesian3 } from 'cesium';
import { ElMessage } from 'element-plus';
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection } from 'geojson';
const earthStore = useEarthStore()
const drawObj = ref()
const drawType = ref('point')
// 生成的 GeoJson 是否需要带上高程， 
const featureHasHeight = ref(true)
const continuous = ref(false)
// 要素是否贴地
const clampToGround = ref(false)
// 标绘个数 
const featureNum = ref(0)
let GeoJson: FeatureCollection
// 鼠标选中实体的ID
const SelEntityID = ref('')
// 被选中的实体的源数据 
let SelEntityGeoJson: Feature
const SelEntityType = ref('')
// 绘制【点线面】实体的样式
const DrawType = [
	{
		fillColor: 'rgb(238, 204, 204)',
		fillStyle: './icon/full.png',
		borderColor: 'rgb(252, 220, 113)',
		borderWidth: '5px',
		borderStyle: 'solid',
		opacity: '0.5'
	},
	{
		fillColor: 'rgb(2,0,255)',
		fillStyle: 'solid',
		lineWidth: '5',
		opacity: '0.5'
	},
	{}
]
let earth: CesiumEarth.Earth;

onMounted(async () => {
	earth = await earthStore.getEarth()
	const exportedData = {
		'type': 'FeatureCollection',
		'features': [{
			'type': 'Feature',
			'properties': { 'id': 1, 'name': 'dian' },
			'geometry': { 'type': 'Point', 'coordinates': [118.85728805317318, 31.93716523454959] }
		}, {
			'type': 'Feature',
			'properties': { 'name': 'line', 'id': '2' },
			'geometry': {
				'type': 'LineString',
				'coordinates': [[118.85770201626333, 31.937407016879508], [118.85770501626169, 31.936949016877445]]
			}
		}, {
			'type': 'Feature',
			'properties': { 'name': 'mian', 'id': '3' },
			'geometry': {
				'type': 'Polygon',
				'coordinates': [[[118.85818603210315, 31.937115033357884], [118.85835703195315, 31.937461033216735], [118.85851903180955, 31.937087033080026], [118.85818603210315, 31.937115033357884]]]
			}
		}, {
			'type': 'Feature',
			'properties': { 'id': '4', 'name': 'zhengfang' },
			'geometry': {
				'type': 'Polygon',
				'coordinates': [[[118.8588256920661, 31.937018560578384], [118.85882564900794, 31.937493668156172], [118.85921029560595, 31.93749424990143], [118.8592103386605, 31.93701914232341], [118.8588256920661, 31.937018560578384]]]
			}
		}, {
			'type': 'Feature', 'properties': { 'id': '5', 'name': 'yuan' }, 'geometry': {
				'type': 'Polygon',
				'coordinates': [[[118.85969110210809, 31.937449523541787], [118.85971399603673, 31.93744854103502], [118.85973663930271, 31.937445535763043], [118.85975878382096, 31.93744054065307], [118.85978018697136, 31.93743361043385], [118.85980061425695, 31.937424821036082], [118.8598198418731, 31.937414268760364], [118.8598376591596, 31.937402069222045], [118.85985387090842, 31.93738835608439], [118.85986829950268, 31.937373279594063], [118.85988078686226, 31.937357004934785], [118.85989119617582, 31.937339710417586], [118.85989941339953, 31.937321585526917], [118.85990534850649, 31.937302828844665], [118.85990893647285, 31.937283645874267], [118.85991013799037, 31.937264246789198], [118.85990893989667, 31.937244844130174], [118.85990535531955, 31.937225650476485], [118.85989942353318, 31.93720687611704], [118.85989120952749, 31.937188726746307], [118.85988080329648, 31.93717140121084], [118.85986831885195, 31.937155089330677], [118.85985389297454, 31.937139969819807], [118.8598376837152, 31.937126208328163], [118.85981986866364, 31.93711395562688], [118.85980064300263, 31.937103345956558], [118.85978021736986, 31.93709449555656], [118.85975881554997, 31.937087501391584], [118.85973667202312, 31.93708244008942], [118.85971402939596, 31.937079367101425], [118.85969113574366, 31.937078316095104], [118.85966824189217, 31.937079298585232], [118.85964559867004, 31.937082303807717], [118.85962345416041, 31.93708729883753], [118.85960205098306, 31.9370942289494], [118.85958162363613, 31.937103018217332], [118.8595623959269, 31.937113570346405], [118.85954457851969, 31.937125769727672], [118.85952836662773, 31.937139482704723], [118.85951393787425, 31.93715455903794], [118.85950145034627, 31.937170833550443], [118.8594910408625, 31.937188127937635], [118.85948282347421, 31.937206252720728], [118.85947688821555, 31.937225009322557], [118.85947330011686, 31.93724419224319], [118.8594720984923, 31.937263591311318], [118.85947329650891, 31.937282993986987], [118.85947688104216, 31.937302187690154], [118.8594828128199, 31.937320962129768], [118.85949102685254, 31.937339111607848], [118.85950143314491, 31.93735643727315], [118.85951391768252, 31.937372749299964], [118.85952834368065, 31.937387868967885], [118.85954455308308, 31.937401630620133], [118.8595623682939, 31.937413883478524], [118.8595815941233, 31.93742449329562], [118.85960201992629, 31.937433343825628], [118.85962342191074, 31.937440338098174], [118.85964556558933, 31.937445399480758], [118.85966820834878, 31.937448472518525], [118.85969110210809, 31.937449523541787]]]
			}
		}, {
			'type': 'Feature',
			'properties': {},
			'geometry': { 'type': 'Point', 'coordinates': [118.85986935571306, 31.937916333940596] }
		}]
	};
	localStorage.setItem('exportedData', JSON.stringify(exportedData));
	setClampToGround(clampToGround.value);
	const geoJson = localStorage.getItem('exportedData');
	// const geoJson = localStorage.getItem('plotTool-geoJson');
	if (geoJson) {
		earth.plotTool.GeoJson = JSON.parse(geoJson);
		earth.plotTool.analyticGeometry();
	}
})
onUnmounted(() => {
	// localStorage.setItem('exportedData', JSON.stringify(exportedData));
	localStorage.setItem('plotTool-geoJson', JSON.stringify(earth.plotTool.GeoJson));
	removeAll();
})
// 由子组件触发的设置绘制样式
function setDrawObj(obj: any) {
	drawObj.value = obj;
}

// 重新解析 GeoJson 几何，将点线面载入到地图
function analyticGeometry() {
	earth.plotTool.analyticGeometry();
}

// 修改标绘的贴地模式
function setClampToGround(param: any) {
	earth.plotTool.clampToGround = param;
	earth.plotTool.analyticGeometry();
}


function pick() {
	let handler = new ScreenSpaceEventHandler(earth.viewer3D.canvas);

	// 鼠标移动 图标变化
	handler.setInputAction((event: any) => {
		let pickedFeature = earth.viewer3D.scene.pick(event.endPosition);
		if (pickedFeature && pickedFeature.id) {
			parent.document.body.style.cursor = 'crosshair';
		} else {
			parent.document.body.style.cursor = 'pointer';
		}
	}, ScreenSpaceEventType.MOUSE_MOVE);

	// 左键按下拾取坐标事件
	handler.setInputAction((event: any) => {
		let earthPosition = earth.viewer3D.scene.pickPosition(event.position);

		if (defined(earthPosition)) {
			let pickedFeature = earth.viewer3D.scene.pick(event.position);
			// 如果拾取的物体有ID，说明它是一个 entity
			if (defined(pickedFeature) && pickedFeature.id) {
				// watching 监听

				if (pickedFeature.id.id.substring(0, 5) === 'Point') {
					SelEntityType.value = 'Point';
				} else if (pickedFeature.id.id.substring(0, 4) === 'Line') {
					SelEntityType.value = 'Line';
				} else if (pickedFeature.id.id.substring(0, 7) === 'Polygon') {
					SelEntityType.value = 'Polygon';
				} else {
					nextTick(() => {
						ElMessage(
							{
								message: '未识别的 几何 类型：' + pickedFeature.id.id,
								type: 'error'
							},
						);
					});
					return;
				}
				nextTick(() => {
					ElMessage({ message: '选中实体成功', type: 'success' });
				});
				SelEntityID.value = pickedFeature.id.id;
				SelEntityChange();
			}
		}
		parent.document.body.style.cursor = 'pointer';
		handler.destroy();
	}, ScreenSpaceEventType.LEFT_CLICK);

	// 左键弹起
	handler.setInputAction((event: any) => {
		parent.document.body.style.cursor = 'pointer';
		handler.destroy();
	}, ScreenSpaceEventType.LEFT_UP);
}
// 取消选中entity
function unPick() {
	SelEntityID.value = '';
	SelEntityGeoJson = {} as Feature;
	SelEntityChange();
	nextTick(() => {
		ElMessage({ message: '取消选中实体', type: 'warning' });
	});
}
function SelEntityChange() {
	// 清空全部的虚拟点
	earth.plotTool.analyticGeometry();

	if (SelEntityID.value !== '') {
		// $('#a_tab3').tab('show');
		const el = document.getElementById('a_tab3')
		el?.classList.add('active')

		turf.featureEach(GeoJson, function (currentFeature, featureIndex) {
			if (currentFeature.properties?.id === SelEntityID) {
				SelEntityGeoJson = currentFeature;
			}
		});

		turf.coordEach(SelEntityGeoJson, function (
			currentCoord,
			coordIndex
		) {
			// 因为面是首尾相连，最后一个点和第一个点相同，所以跳过第一个点
			if (
				turf.getType(SelEntityGeoJson) === 'Polygon' &&
				coordIndex === 0
			) {
				return;
			}

			// 如果选中的实体仅有【经度、纬度】，没有高程，则给它指定为 0 高程
			currentCoord[2] = currentCoord[2] ? currentCoord[2] : 0;

			const pos = Cartesian3.fromDegrees(
				currentCoord[0]!,
				currentCoord[1]!,
				currentCoord[2]!
			);
			earth.plotTool.dataSourceTool.entities.add(
				buildVirtualPoint(pos, { id: '端点-' + coordIndex })
			);
		});
	} else {
		// $('#a_tab1').tab('show');
		const el = document.getElementById('a_tab1')
		el?.classList.add('active')
	}
}

// 刷新
function refresh() {
	featureNum.value = earth.plotTool.GeoJson.features.length;
}

// 标绘新要素
async function draw() {
	const draw = JSON.parse(JSON.stringify(drawObj.value));
	switch (draw.type) {
		case 'pointEntity': {
			draw['marker-symbol'] = await imgUrl2Base64(draw.symbolUrl);
			await earth.plotTool.addPoint(draw)
			break;
		}
		case 'polylineEntity': {
			await earth.plotTool.addMultiLine(draw.params.material, draw.params.lineMaterialWidth, null);
			break;
		}
		case 'polygonEntity': {
			await earth.plotTool.addPolygon(featureHasHeight.value);
			break;
		}
		case 'modelEntity': {
			await earth.plotTool.addModel(draw.modelUrl, 20);
			break;
		}
		case 'winInfo': {
			await draw.symbolUrl && (draw['marker-symbol'] = await imgUrl2Base64(draw.symbolUrl));
			await earth.plotTool.addPoint(draw);
			break;
		}
		case 'particleSystem': {
			await earth.plotTool.addPoint(draw);
			break;
		}
		default: {
			ElMessage({ message: '当前版本为免费试用版 V0.14，暂时无法使用支持该类型的标绘~', type: 'warning' });
		}
	}

	if (continuous.value) {
		await draw();
	}
}

function moveEntityNode() {
	let handler = new ScreenSpaceEventHandler(earth.viewer3D.canvas);
	let pickedFeature;
	//鼠标移动事件，遇到端点鼠标样式就变化
	handler.setInputAction((event: any) => {
		if (SelEntityID.value === '') return;
		if (!event.endPosition) return;
		pickedFeature = earth.viewer3D.scene.pick(event.endPosition);
		if (
			pickedFeature &&
			pickedFeature.id &&
			pickedFeature.id.id.substring(0, 3) === '端点-'
		) {
			parent.document.body.style.cursor = 'move';
		} else if (pickedFeature && pickedFeature.id) {
			parent.document.body.style.cursor = 'no-drop';
		} else {
			pickedFeature = null;
			parent.document.body.style.cursor = 'pointer';
		}
	}, ScreenSpaceEventType.MOUSE_MOVE);

	//鼠标左点击，拾取结束
	handler.setInputAction((event: any) => {
		parent.document.body.style.cursor = 'pointer';
		handler.destroy();
	}, ScreenSpaceEventType.LEFT_DOWN);

	// dragEntity(earth.viewer3D, (data: any) => {
	// 	if (data.entityId.substring(0, 3) === '端点-') {
	// 		let positions = cartesianToCartographic([data.endPosition])[0];
	// 		let index = data.entityId.substring(3) * 1;
	// 		let type = turf.getType(SelEntityGeoJson);

	// 		console.log(type);
	// 		if (type === 'Point') {
	// 			addGeoJsonBackupBefore();
	// 			positions = cartesianToCartographic([data.endPosition]);
	// 			SelEntityGeoJson.geometry.coordinates = JSON.parse(
	// 				JSON.stringify(positions)
	// 			)[0];
	// 			addGeoJsonBackupAfter();
	// 		} else if (type === 'LineString') {
	// 			addGeoJsonBackupBefore();
	// 			SelEntityGeoJson.geometry.coordinates[index] = JSON.parse(
	// 				JSON.stringify(positions)
	// 			);
	// 			addGeoJsonBackupAfter();
	// 		} else if (type === 'Polygon') {
	// 			addGeoJsonBackupBefore();
	// 			SelEntityGeoJson.geometry.coordinates[0][index] = JSON.parse(
	// 				JSON.stringify(positions)
	// 			);

	// 			// 这是面的最后一个点，则它和第一个点相同
	// 			let length = SelEntityGeoJson.geometry.coordinates[0].length;
	// 			if (length === index + 1) {
	// 				console.log('这是最后一个点');
	// 				SelEntityGeoJson.geometry.coordinates[0][0] = JSON.parse(
	// 					JSON.stringify(positions)
	// 				);
	// 			}
	// 			addGeoJsonBackupAfter();
	// 		} else if (type === 'MultiPoint') {
	// 			console.log('暂不支持的类型', type);
	// 		} else if (type === 'MultiLineString') {
	// 			console.log('暂不支持的类型', type);
	// 		} else if (type === 'MultiPolygon') {
	// 			console.log('暂不支持的类型', type);
	// 		} else if (type === 'GeometryCollection') {
	// 			console.log('暂不支持的类型', type);
	// 		} else {
	// 			console.log('无法识别的类型', type);
	// 		}

	// 		nextTick(() => {
	// 			ElMessage({ message: '移动实体成功', type: 'success' });
	// 		});
	// 	} else {
	// 		nextTick(() => {
	// 			ElMessage({ message: '您移动的不是端点', type: 'warning' });
	// 		});
	// 	}
	// 	unPick();
	// });
}
function moveEntityAll() {
	let handler = new ScreenSpaceEventHandler(earth.viewer3D.canvas);
	let pickedFeature;
	//鼠标移动事件，遇到端点鼠标样式就变化
	handler.setInputAction((event: any) => {
		if (SelEntityID.value === '') return;
		if (!event.endPosition) return;
		pickedFeature = earth.viewer3D.scene.pick(event.endPosition);
		if (
			pickedFeature &&
			pickedFeature.id &&
			pickedFeature.id.id.substring(0, 3) !== '端点-'
		) {
			parent.document.body.style.cursor = 'move';
		} else if (pickedFeature && pickedFeature.id) {
			parent.document.body.style.cursor = 'no-drop';
		} else {
			pickedFeature = null;
			parent.document.body.style.cursor = 'pointer';
		}
	}, ScreenSpaceEventType.MOUSE_MOVE);

	//鼠标左点击，拾取结束
	handler.setInputAction((event: any) => {
		parent.document.body.style.cursor = 'pointer';
		handler.destroy();
	}, ScreenSpaceEventType.LEFT_DOWN);

	// dragEntity(earth.viewer3D, (data: any) => {
	// 	if (data.entityId.substring(0, 3) !== '端点-') {
	// 		const changeX = data.endPosition.x - data.startPosition.x;
	// 		const changeY = data.endPosition.y - data.startPosition.y;
	// 		const changeZ = data.endPosition.z - data.startPosition.z;

	// 		turf.coordEach(SelEntityGeoJson, function (
	// 			currentCoord,
	// 			coordIndex,
	// 			featureIndex,
	// 			multiFeatureIndex,
	// 			geometryIndex
	// 		) {
	// 			const pos = Cartesian3.fromDegrees(
	// 				currentCoord[0]!,
	// 				currentCoord[1]!,
	// 				currentCoord[2]!
	// 			);
	// 			pos.x += changeX;
	// 			pos.y += changeY;
	// 			pos.z += changeZ;

	// 			let ellipsoid = earth.viewer3D.scene.globe.ellipsoid;
	// 			let cartographic = ellipsoid.cartesianToCartographic(pos);

	// 			currentCoord[0] = Math.toDegrees(cartographic.longitude);
	// 			currentCoord[1] = Math.toDegrees(cartographic.latitude);
	// 		});

	// 		analyticGeometry();
	// 		nextTick(() => {
	// 			ElMessage({ message: '移动实体成功', type: 'success' });
	// 		});
	// 	} else {
	// 		nextTick(() => {
	// 			ElMessage({ message: '您移动的是端点，而不是几何体', type: 'warning' });
	// 		});
	// 	}
	// 	unPick();
	// });
}

function delEntity() {
	// addGeoJsonBackupBefore();
	earth.plotTool.dataSourceTool.entities.removeById(SelEntityID.value);
	let geo = turf.featureCollection([]);
	turf.featureEach(GeoJson, function (currentFeature, featureIndex) {
		if (currentFeature.properties?.id !== SelEntityID.value) {
			geo.features.push(currentFeature);
		}
	});
	GeoJson = geo;
	// addGeoJsonBackupAfter();
	nextTick(() => {
		ElMessage({ message: '删除实体成功', type: 'success' });
	});
}

// 撤销操作
function cancel() {
	earth.plotTool.revoke();
	// unPick();
	ElMessage({ message: '撤销操作', type: 'warning' });
}

// 重置数据
function removeAll() {
	earth.plotTool.removeAll();
}



</script>

<style lang="scss" scoped>
.tabbable {
	text-align: left;
	min-width: 280px;
	min-height: 350px;
	border-radius: 5px;
	color: #009b94;

	a {
		color: #009b94;
	}



	.extend-close-btn {
		color: #009b94;
		font-size: 24px;
		padding-top: 7px;
		padding-right: 3px;
	}

	.icon-box {
		display: block;
		height: 100%;
		padding: 5px;
		border: silver dashed 1px;

		img {
			width: 28px;
			height: 28px;
			margin-top: 5px;
		}
	}

	.padding-top {
		padding-top: 15px;
	}
}


#tab1 {
	height: 100%;
	padding: 10px;
}

#ctrlBtn {
	text-align: center;

	button {
		margin: 0 2px;
	}
}

#tab3 {
	padding: 15px;
	height: 300px;
	overflow: auto;
	border: black 1px dashed
}

.tab-content .tab-pane {
	display: none;
}

.tab-content .active {
	display: block;
}
</style>
