<template>
    <win-tabs :firstGuide="firstGuide" :initCSS="{ width: 340, height: 300, left: 1330, top: 610 }" @close="close"
        @openHelp="openHelp">
        <tab-pane label="坐标标注">
            <coord-plot></coord-plot>
        </tab-pane>
        <tab-pane label="坐标定位">
            <div class="centerXY">
                <!--radio选择框-->
                <div>
                    <div class="radio radio-info radio-inline">
                        <input id="rdoType1" v-model="pccradio" name="rdoType" type="radio" value="1">
                        <label for="rdoType1">十进制</label>
                    </div>
                    <div class="radio radio-info radio-inline">
                        <input id="rdoType2" v-model="pccradio" name="rdoType" type="radio" value="2">
                        <label for="rdoType2">度分秒</label>
                    </div>
                    <div class="radio radio-info radio-inline">
                        <input id="rdoType3" v-model="pccradio" name="rdoType" type="radio" value="3">
                        <label for="rdoType3">平面坐标</label>
                    </div>
                </div>
                <!--表单内容区-->
                <form v-if="pccradio == 1" autocomplete="off" class="form-horizontal" name="navText">
                    <div class="viewTen">
                        <div>
                            <label>坐标系：</label>
                            <select v-model="coordinateSystem" clearable style="width:160px;margin-top:10px">
                                <option v-for="item in coordinateSystemFormList" :key="item.index" :label="item.name"
                                    :value="item.index">
                                </option>
                            </select>
                        </div>
                        <div v-if="coordinateSystem === 0">
                            <div title="请输入-180至180之间的数字">
                                <label>经度：</label>
                                <input id="txtLngTen" ref="watchCoordinate" v-model="degrees.longitude"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px;"
                                    type="text">
                            </div>
                            <div title="请输入-90至90之间的数字">
                                <label>纬度：</label>
                                <input id="txtLatTen" ref="watchCoordinate2" v-model="degrees.latitude"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px;"
                                    type="text">
                            </div>
                        </div>
                        <div v-if="coordinateSystem === 1">
                            <div title="请输入-180至180之间的数字">
                                <label>经度：</label>
                                <input id="txtLngTen1" ref="watchCoordinate" v-model="gcj02.lon"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px;"
                                    type="text">
                            </div>
                            <div title="请输入-90至90之间的数字">
                                <label>纬度：</label>
                                <input id="txtLatTen1" ref="watchCoordinate2" v-model="gcj02.lat"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px;"
                                    type="text">
                            </div>
                        </div>
                        <div v-if="coordinateSystem === 2">
                            <div title="请输入-180至180之间的数字">
                                <label>经度：</label>
                                <input id="txtLngTen2" ref="watchCoordinate" v-model="bd09.lon"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px;"
                                    type="text">
                            </div>
                            <div title="请输入-90至90之间的数字">
                                <label>纬度：</label>
                                <input id="txtLatTen2" ref="watchCoordinate2" v-model="bd09.lat"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px;"
                                    type="text">
                            </div>
                        </div>
                        <div>
                            <label>高程：</label>
                            <input id="txtLatAlt" v-model="degrees.height" style="width:160px;margin-top:10px;"
                                type="text">
                        </div>
                    </div>
                </form>
                <form v-if="pccradio == 2" id="coordinateForm" autocomplete="off" class="form-horizontal"
                    name="navText">
                    <div class="viewDms">
                        <div>
                            <label>坐标系：</label>
                            <select v-model="coordinateSystem" clearable style="width:160px;margin-top:10px">
                                <option v-for="item in coordinateSystemFormList" :key="item.index" :label="item.name"
                                    :value="item.index">
                                </option>
                            </select>
                        </div>
                        <div>
                            <label>经度：</label>
                            <input id="txtLngDegree" v-model="alert.b1" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                style="width:60px;margin-top:10px" type="text">
                            <label>&nbsp;°</label>
                            <input id="txtLngMinute" v-model="alert.b2" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                style="width:50px;margin-top:10px" type="text">
                            <label>&nbsp;′</label>
                            <input id="txtLngSecond" v-model="alert.b3" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                style="width:50px;margin-top:10px" type="text">
                            <label>&nbsp;″</label>
                        </div>
                        <div>
                            <label>纬度：</label>
                            <input id="txtLatDegree" v-model="alert.v1" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                style="width:60px;margin-top:10px;" type="text">
                            <label>&nbsp;°</label>
                            <input id="txtLatMinute" v-model="alert.v2" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                style="width:50px;margin-top:10px;" type="text">
                            <label>&nbsp;′</label>
                            <input id="txtLatSecond" v-model="alert.v3" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                style="width:50px;margin-top:10px;" type="text">
                            <label>&nbsp;″</label>
                        </div>
                        <div>
                            <label>高程：</label>
                            <input id="txtDmsAlt" v-model="degrees.height" name="txtDmsAlt" step="0.1"
                                style="width:100px;margin-top:10px" type="text">
                        </div>
                    </div>
                </form>
                <form v-if="pccradio == 3" id="xyForm" autocomplete="off" class="form-horizontal" name="navText">
                    <div class="viewGk">
                        <div>
                            <label>坐标系：</label>
                            <select id="System1" v-model="system" clearable style="width:160px;margin-top:10px">
                                <option v-for="item in coordinateFormList" :key="item.index" :label="item.name"
                                    :value="item.index">
                                </option>
                            </select>
                        </div>
                        <div v-if="system === 0">
                            <div>
                                <label>纵坐标：</label>
                                <input id="txtGk3X" v-model="cartesian3.y"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px"
                                    type="text">
                            </div>
                            <div>
                                <label>横坐标：</label>
                                <input id="txtGk3Y" v-model="cartesian3.x"
                                    onkeyup="value=value.replace(/[^\-?\d.]/g,'')" style="width:160px;margin-top:10px"
                                    type="text">
                            </div>
                        </div>
                        <div v-if="system === 1">
                            <div>
                                <label>纵坐标：</label>
                                <input id="txtGk3X1" v-model="EPSG3857.y" style="width:160px;margin-top:10px"
                                    type="text">
                            </div>
                            <div>
                                <label>横坐标：</label>
                                <input id="txtGk3Y1" v-model="EPSG3857.x" style="width:160px;margin-top:10px"
                                    type="text">
                            </div>
                        </div>
                        <div v-if="system === 2">
                            <div>
                                <label>纵坐标：</label>
                                <input id="txtGk3X2" v-model="mercator.y" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                    style="width:160px;margin-top:10px" type="text">
                            </div>
                            <div>
                                <label>横坐标：</label>
                                <input id="txtGk3Y2" v-model="mercator.x" onkeyup="value=value.replace(/[^\-?\d.]/g,'')"
                                    style="width:160px;margin-top:10px" type="text">
                            </div>
                        </div>
                        <div>
                            <label>高程值：</label>
                            <input id="txtGk3Alt" v-model="degrees.height" step="0.1"
                                style="width:160px;margin-top:10px" type="text">
                        </div>
                    </div>
                </form>
                <!--按钮功能区-->
                <div class="co-btn">
                    <el-button size="small" type="success" @click="pickPoint">图上拾取</el-button>
                    <el-button size="small" type="primary" @click="coordinate">坐标定位</el-button>
                    <el-button size="small" type="warning" @click="toCopy">复制到粘贴板</el-button>
                </div>
            </div>
        </tab-pane>
    </win-tabs>
</template>
<script setup lang="ts">
import { TabPane, WinTabs } from '../../winTabs'
import toClipboard from './lib/toClipboard';
import coordinateOffset from './img/CoordinateOffset';
import CoordPlot from './coordPlot.vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore.js';
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { Cartesian3, NearFarScalar, VerticalOrigin, Cartographic, Math as CesiumMath } from 'cesium';
import proj4 from 'proj4';
import { CoordinateType } from '@/lib/CesiumEarth/ts/DrawShape/CoordinateType';
import { ElMessage } from 'element-plus';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()
const firstGuide = ref(true)
const coordinateSystem = ref(0) //弧度下拉窗显隐 
const system = ref(0)        //平面坐标下拉窗显隐
const coordinateSystemFormList = ref([
    { index: 0, name: 'WGS-84' },
    { index: 1, name: 'GCJ-02' },
    { index: 2, name: 'BD09' }
    // {index: 3, name: '北京54'},
])
const coordinateFormList = ref([
    { index: 0, name: 'WGS-84' },
    { index: 1, name: 'EPSG:3857' },
    { index: 2, name: 'Web mercator' }
    // {index: 3, name: '北京54'},
])
const pccradio = ref(1)
const cartesian3 = ref({
    x: 0,
    y: 0,
    z: 0
})
const degrees = ref({
    longitude: 0,
    latitude: 0,
    height: 0
})
const alert = ref({
    v1: 0,
    v2: 0,
    v3: 0,
    b1: 0,
    b2: 0,
    b3: 0
})
const alert10 = ref({
    lon: 0,
    lat: 0
})
const C3toDu = ref({
    lon: 0,
    lat: 0,
    alt: 0
})
const gcto84 = ref({
    lon: 0,
    lat: 0
})
const bdto84 = ref({
    lon: 0,
    lat: 0
})
const mctTo84 = ref({
    lon: 0,
    lat: 0
})
const EPSG3857 = ref({
    x: 0,
    y: 0
})
const EPSG4326 = ref({
    x: 0,
    y: 0
})
const gcj02 = ref({
    lat: 0,
    lon: 0
})
const bd09 = ref({
    lat: 0,
    lon: 0
})
const mercator = ref({
    y: 0,
    x: 0
})
onUnmounted(() => {
    document.onmousemove = null;
})
let earth: CesiumEarth.Earth;
onMounted(async () => {
    firstGuide.value = localStorage.getItem('firstGuide') === 'true';
    if (firstGuide.value) {
        firstGuide.value = false;
    } else {
        firstGuide.value = true
        localStorage.setItem('firstGuide', 'true');
    }

    earth = await earthStore.getEarth()
})
watch(() => alert.value, (newValue, oldValue) => {
    changeDuLon(alert.value.b1, alert.value.b2, alert.value.b3);
    changeDuLat(alert.value.v1, alert.value.v2, alert.value.v3);
})
watch(() => cartesian3.value, (newValue, oldValue) => {
    c3toDu(cartesian3.value.x, cartesian3.value.y, cartesian3.value.z)
})
watch(() => gcj02.value, (newValue, oldValue) => {
    gcj02towgs84(gcj02.value.lat, gcj02.value.lon)
})
watch(() => bd09, (newValue, oldValue) => {
    bd09towgs84(bd09.value.lat, bd09.value.lon)
})
watch(() => mercator.value, (newValue, oldValue) => {
    mercatorToWgs84(mercator.value.y, mercator.value.x)
})


/**
 * 添加点entity
 */
function addMarkEntity(lon: number, lat: number, height: number) {
    earth.viewer3D.entities.removeById('coordinatePonint');
    earth.viewer3D.entities.add({//创建定位点
        id: 'coordinatePonint',
        name: 'coordinates',
        position: Cartesian3.fromDegrees(lon, lat, height),
        billboard: {
            image: new URL('./img/coordinates.png', import.meta.url).href,//定位的图片样式
            width: 15,
            height: 21,
            scaleByDistance: new NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
            verticalOrigin: VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    });
}
/**
 * 获取坐标 高程 画点
 */
function pickPoint() {
    remove();
    addImage();
    const drawShape = new CesiumEarth.DrawShape(earth.viewer3D);
    drawShape.drawPoint({
        coordinateType: CoordinateType.cartographicObj,
        endCallback: function (ps: any[]) {
            //经纬度
            const lon = Math.floor(ps[0].longitude * 1000000) / 1000000;
            const lat = Math.floor(ps[0].latitude * 1000000) / 1000000;
            degrees.value.latitude = ps[0].latitude;
            degrees.value.longitude = ps[0].longitude;
            degrees.value.height = ps[0].height;
            //cartesian3
            const ellipsoid = earth.viewer3D.scene.globe.ellipsoid;
            const cartographic = Cartographic.fromDegrees(ps[0].longitude, ps[0].latitude);
            const cartesian3 = ellipsoid.cartographicToCartesian(cartographic);
            cartesian3.x = cartesian3.x;
            cartesian3.y = cartesian3.y;
            cartesian3.z = cartesian3.z;
            //EPSG:3857
            const a = proj4('EPSG:4326', 'EPSG:3857', { x: cartographic.latitude, y: cartographic.longitude });
            EPSG3857.value.x = a.x;
            EPSG3857.value.y = a.y;

            wgs84togcj02(ps[0].latitude, ps[0].longitude);
            gcj02tobd09();
            wgs84tomercator(ps[0].latitude, ps[0].longitude);
            formatDegree(ps[0].latitude, ps[0].longitude);//度转度分秒
            addMarkEntity(ps[0].longitude, ps[0].latitude, ps[0].height);
            remove();
        },
        errCallback: function () {
            remove();
        }
    });
}
/**
 * 世界坐标转经纬度
 */
function c3toDu(x: number, y: number, z: number) {
    const ellipsoid = earth.viewer3D.scene.globe.ellipsoid;
    const cartesian3 = new Cartesian3(x, y, z);
    const cartographic = ellipsoid.cartesianToCartographic(cartesian3);
    C3toDu.value.lat = CesiumMath.toDegrees(cartographic.latitude);
    C3toDu.value.lon = CesiumMath.toDegrees(cartographic.longitude);
    C3toDu.value.alt = cartographic.height;
}
/**
 * 墨卡托转WGS84
 */
function mercatorToWgs84(y: number, x: number) {
    const resultmercatorToWgs84 = coordinateOffset.mercator_decrypt(y, x);
    mctTo84.value.lat = resultmercatorToWgs84.lat;
    mctTo84.value.lon = resultmercatorToWgs84.lon;
}
/**
 * 百度坐标转WGS-84
 */
function bd09towgs84(lat: number, lon: number) {
    const resultbdtogc = coordinateOffset.bd_decrypt(lat, lon);
    const resultgctogc = coordinateOffset.gcj_decrypt(resultbdtogc.lat, resultbdtogc.lon);
    bdto84.value.lat = resultgctogc.lat;
    bdto84.value.lon = resultgctogc.lon;
}
/**
 * 国测局坐标转WGS-84
 */
function gcj02towgs84(lat: number, lon: number) {
    const result84 = coordinateOffset.gcj_decrypt(lat, lon);
    gcto84.value.lat = result84.lat;
    gcto84.value.lon = result84.lon;
}
/**
 * wgs84转gcj02
 */
function wgs84togcj02(lng: number, lat: number) {
    const resultgc = coordinateOffset.gcj_encrypt(lng, lat);
    gcj02.value.lat = resultgc.lat;
    gcj02.value.lon = resultgc.lon;
}
/**
 * gcj02转bd09
 */
function gcj02tobd09() {
    const resultbd = coordinateOffset.bd_encrypt(gcj02.value.lat, gcj02.value.lon);
    bd09.value.lat = resultbd.lat;
    bd09.value.lon = resultbd.lon;
}
/**
 * wgs84转Web mercator
 */
function wgs84tomercator(lng: number, lat: number) {
    const resultmt = coordinateOffset.mercator_encrypt(lng, lat);
    mercator.value.y = resultmt.lat;
    mercator.value.x = resultmt.lon;
}
/**
 * 关闭按钮 移除点
 */
function close() {
    remove();
    ceStore.setCesiumEarthComAction('coordinates', 2)
    earth.viewer3D.entities.removeById('coordinatePonint');
}
function openHelp() {
    console.log('帮助教程');
}
/**
 * 度转度分秒
 * @param latitude 经度
 * @param longitude 纬度
 */
function formatDegree(latitude: number, longitude: number) {
    if (latitude) {
        latitude = Math.abs(latitude);  //返回数的绝对值
        alert.value.v1 = Math.floor(latitude);//度   //对数进行下舍入
        alert.value.v2 = Math.floor((latitude - alert.value.v1) * 60);//分
        alert.value.v3 = Math.round((latitude - alert.value.v3) * 3600 % 60);//秒  //把数四舍五入为最接近的整数
    }
    if (longitude) {
        longitude = Math.abs(longitude);  //返回数的绝对值
        alert.value.b1 = Math.floor(longitude);//度   //对数进行下舍入
        alert.value.b2 = Math.floor((longitude - alert.value.b1) * 60);//分
        alert.value.b3 = Math.round((longitude - alert.value.b3) * 3600 % 60);//秒  //把数四舍五入为最接近的整数
    }
}
/**
 * 度分秒转度
 * @param du
 * @param fen
 * @param miao
 */
function changeDuLon(du: number, fen: number, miao: number) {
    let mFen = 0;
    if (miao) {
        mFen = Number(miao / 60);
    }
    let fDu = 0;
    if (fen) {
        fDu = (Number(fen) + mFen) / 60;
    } else {
        fDu = mFen;
    }
    let lDu = 0;
    if (du) {
        lDu = Number((Number(du) + fDu).toFixed(6));
    } else {
        lDu = Number(fDu.toFixed(6));
    }
    alert10.value.lon = lDu;
}
function changeDuLat(du: number, fen: number, miao: number) {
    let mFen = 0;
    if (miao) {
        mFen = Number(miao / 60);
    }
    let fDu = 0;
    if (fen) {
        fDu = (Number(fen) + mFen) / 60;
    } else {
        fDu = mFen;
    }
    let lDu = 0;
    if (du) {
        lDu = Number((Number(du) + fDu).toFixed(6));
    } else {
        lDu = Number(fDu.toFixed(6));
    }
    alert10.value.lat = lDu;
}
let mv: HTMLImageElement | null = null;
/**
 * 添加跟随鼠标的图标
 */
function addImage() {
    mv = document.createElement('img');
    mv.src = new URL('./img/coordinates.png', import.meta.url).href;
    mv.style.position = 'absolute';
    mv.style.left = '-100px';
    mv.style.top = '-100px';
    document.body.append(mv);

    document.onmousemove = function (e) {
        if (!mv) return
        mv.style.left = e.clientX - mv.width / 2 + 'px';
        mv.style.top = e.clientY - mv.height + 'px';
    };
}
/**
 * 移除跟随鼠标的点图标
 */
function remove() {
    document.onmousemove = null;
    if (mv) {
        mv.remove();
    }
}
/**
 * 视角飞行 高度3000
 */
function coordinatePoint(lon: number, lat: number) {
    earth.viewer3D.entities.removeById('coordinatePonint');
    addMarkEntity(lon, lat, degrees.value.height);
    earth.viewer3D.camera.flyTo({//定位过去
        destination: Cartesian3.fromDegrees(lon, lat, 3000)
    });
}

const watchCoordinate = ref();
const watchCoordinate2 = ref();
/**
 * 坐标定位
 */
function coordinate() {
    remove();
    if (pccradio.value == 1) {
        if (coordinateSystem.value === 0) {
            coordinatePoint(Number(watchCoordinate.value.value), Number(watchCoordinate2.value.value));
        } else if (coordinateSystem.value === 1) {
            coordinatePoint(gcto84.value.lon, gcto84.value.lat);
        } else if (coordinateSystem.value === 2) {
            coordinatePoint(bdto84.value.lon, bdto84.value.lat);
        }
    } else if (pccradio.value == 2) {
        coordinatePoint(alert10.value.lon, alert10.value.lat);
    } else if (pccradio.value == 3) {
        if (system.value === 0) {
            coordinatePoint(C3toDu.value.lon, C3toDu.value.lat);
        } else if (system.value === 1) {
            coordinatePoint(Number(watchCoordinate.value.value), Number(watchCoordinate2.value.value));
        } else if (system.value === 2) {
            coordinatePoint(mctTo84.value.lon, mctTo84.value.lat);
        }
    }
}
function toCopy() {
    toClipboard(
        JSON.stringify({
            lon: alert10.value.lon,
            lat: alert10.value.lat,
            height: degrees.value.height
        }, null, 4),
        () => {
            ElMessage({
                message: '设备标识码 - 复制到粘贴板成功',
                type: 'success'
            });
        });
}



</script>

<style lang="scss" scoped>
.radio.radio-inline {
    margin-top: 0;
    position: relative;
    display: inline-block;
    padding-left: 20px;
    margin-bottom: 0;
    font-weight: 400;
    vertical-align: middle;
    cursor: pointer;
}

.radio label {
    display: inline-block;
    vertical-align: middle;
    position: relative;
    padding-left: 5px;
}


.radio label::before {
    content: "";
    display: inline-block;
    position: absolute;
    width: 17px;
    height: 17px;
    left: 0;
    margin-left: -20px;
    border: 1px solid #cccccc;
    border-radius: 50%;
    background-color: #fff;
    transition: border 0.15s ease-in-out;
}

.radio-info input[type="radio"]:checked+label::after {
    background-color: #009b94;
}


.radio label::after {
    display: inline-block;
    position: absolute;
    content: " ";
    width: 11px;
    height: 11px;
    left: 3px;
    top: 3px;
    margin-left: -20px;
    border-radius: 50%;
    transition: transform 0.1s cubic-bezier(0.8, -0.33, 0.2, 1.33);
}

label {
    color: #009b94;
}

.co-btn {
    margin-top: 20px;
    display: flex;
}
</style>
