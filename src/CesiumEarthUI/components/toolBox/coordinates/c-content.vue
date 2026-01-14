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
                <form v-if="pccradio === '1'" autocomplete="off" class="form-horizontal" name="navText">
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
import { ref, watch } from 'vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore.js';
const ceStore = useCesiumEarthStore()

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
    x: 0,
    y: 0
})
const bdto84 = ref({
    x: 0,
    y: 0
})
const mctTo84 = ref({
    x: 0,
    y: 0
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
    x: 0,
    y: 0
})
const bd09 = ref({
    x: 0,
    y: 0
})
const mercator = ref({
    x: 0,
    y: 0
})
const show = computed(() => {
    // return $store.state.CesiumEarthStore.comActions.coordinates; 
    // return ceStore.comActions.

})

mounted() {
    firstGuide.value = localStorage.getItem('firstGuide');
    if (firstGuide) {
        firstGuide = false;
    } else {
        firstGuide = true;
        localStorage.setItem('firstGuide', 'true');
    }
}
watch(() => alert.value, (newValue, oldValue) => {
    changeDuLon(alert.b1, alert.b2, alert.b3);
    changeDuLat(alert.v1, alert.v2, alert.v3);
})
watch(() => cartesian3.value.value, (newValue, oldValue) => {
    c3toDu(cartesian3.value.x, cartesian3.value.y, cartesian3.value.z)
})
watch(() => gcj02.value, (newValue, oldValue) => {
    gcj02towgs84(gcj02.lat, gcj02.lon)
})
watch(() => bd09.value, (newValue, oldValue) => {
    bd09towgs84(bd09.lat, bd09.lon)
})
watch(() => mercator.value, (newValue, oldValue) => {
    mercatorToWgs84(mercator.y, mercator.x)
})


/**
       * 添加点entity
       */
function addMarkEntity(lon, lat, height) {
    window.earth.viewer3D.entities.removeById('coordinatePonint');

    let point = window.earth.viewer3D.entities.add({//创建定位点
        id: 'coordinatePonint',
        name: 'coordinates',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        billboard: {
            image: new URL('./img/coordinates.png', import.meta.url).href,//定位的图片样式
            width: 15,
            height: 21,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    });
}
/**
 * 获取坐标 高程 画点
 */
function pickPoint() {
    let that = this;
    remove();
    addImage();
    let drawShape = new CesiumEarth.DrawShape(CesiumEarth.getMainViewer());
    drawShape.drawPoint({
        coordinateType: 'cartographicObj',
        endCallback: function (ps) {
            //经纬度
            let lon = Math.floor(ps[0].longitude * 1000000) / 1000000;
            let lat = Math.floor(ps[0].latitude * 1000000) / 1000000;
            degrees.latitude = ps[0].latitude;
            degrees.longitude = ps[0].longitude;
            degrees.height = ps[0].height;
            //cartesian3
            let ellipsoid = earth.viewer3D.scene.globe.ellipsoid;
            let cartographic = Cesium.Cartographic.fromDegrees(ps[0].longitude, ps[0].latitude);
            let cartesian3 = ellipsoid.cartographicToCartesian(cartographic);
            cartesian3.x = cartesian3.x;
            cartesian3.y = cartesian3.y;
            cartesian3.z = cartesian3.z;
            //EPSG:3857
            let a = proj4('EPSG:4326', 'EPSG:3857', { x: cartographic.latitude, y: cartographic.longitude });
            EPSG3857.x = a.x;
            EPSG3857.y = a.y;

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
function c3toDu(x, y, z) {
    let ellipsoid = earth.viewer3D.scene.globe.ellipsoid;
    let cartesian3 = new Cesium.Cartesian3(x, y, z);
    let cartographic = ellipsoid.cartesianToCartographic(cartesian3);
    C3toDu.lat = Cesium.Math.toDegrees(cartographic.latitude);
    C3toDu.lon = Cesium.Math.toDegrees(cartographic.longitude);
    C3toDu.alt = cartographic.height;
}
/**
 * 墨卡托转WGS84
 */
function mercatorToWgs84(y, x) {
    let resultmercatorToWgs84 = coordinateOffset.mercator_decrypt(y, x);
    mctTo84.lat = resultmercatorToWgs84.lat;
    mctTo84.lon = resultmercatorToWgs84.lon;
}
/**
 * 百度坐标转WGS-84
 */
function bd09towgs84(lat, lon) {
    let resultbdtogc = coordinateOffset.bd_decrypt(lat, lon);
    let resultgctogc = coordinateOffset.gcj_decrypt(resultbdtogc.lat, resultbdtogc.lon);
    bdto84.lat = resultgctogc.lat;
    bdto84.lon = resultgctogc.lon;
}
/**
 * 国测局坐标转WGS-84
 */
function gcj02towgs84(lat, lon) {
    let result84 = coordinateOffset.gcj_decrypt(lat, lon);
    gcto84.lat = result84.lat;
    gcto84.lon = result84.lon;
}
/**
 * wgs84转gcj02
 */
function wgs84togcj02(lng, lat) {
    let resultgc = coordinateOffset.gcj_encrypt(lng, lat);
    gcj02.lat = resultgc.lat;
    gcj02.lon = resultgc.lon;
}
/**
 * gcj02转bd09
 */
function gcj02tobd09() {
    let resultbd = coordinateOffset.bd_encrypt(gcj02.lat, gcj02.lon);
    bd09.lat = resultbd.lat;
    bd09.lon = resultbd.lon;
}
/**
 * wgs84转Web mercator
 */
function wgs84tomercator(lng, lat) {
    let resultmt = coordinateOffset.mercator_encrypt(lng, lat);
    mercator.y = resultmt.lat;
    mercator.x = resultmt.lon;
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
function formatDegree(latitude, longitude) {
    if (latitude != null && latitude != '') {
        latitude = Math.abs(latitude);  //返回数的绝对值
        alert.v1 = Math.floor(latitude);//度   //对数进行下舍入
        alert.v2 = Math.floor((latitude - alert.v1) * 60);//分
        alert.v3 = Math.round((latitude - alert.v3) * 3600 % 60);//秒  //把数四舍五入为最接近的整数
    }
    if (longitude != null && longitude != '') {
        longitude = Math.abs(longitude);  //返回数的绝对值
        alert.b1 = Math.floor(longitude);//度   //对数进行下舍入
        alert.b2 = Math.floor((longitude - alert.b1) * 60);//分
        alert.b3 = Math.round((longitude - alert.b3) * 3600 % 60);//秒  //把数四舍五入为最接近的整数
    }
}
/**
 * 度分秒转度
 * @param du
 * @param fen
 * @param miao
 */
function changeDuLon(du, fen, miao) {
    let mFen = 0;
    if (miao != null && miao != '') {
        mFen = Number(miao / 60);
    }
    let fDu = 0;
    if (fen != null && fen != '') {
        fDu = (Number(fen) + mFen) / 60;
    } else {
        fDu = mFen;
    }
    let lDu = 0;
    if (du != null && du != '') {
        lDu = (Number(du) + fDu).toFixed(6);
    } else {
        lDu = fDu.toFixed(6);
    }
    alert10.lon = lDu;
}
function changeDuLat(du, fen, miao) {
    let mFen = 0;
    if (miao != null && miao != '') {
        mFen = Number(miao / 60);
    }
    let fDu = 0;
    if (fen != null && fen != '') {
        fDu = (Number(fen) + mFen) / 60;
    } else {
        fDu = mFen;
    }
    let lDu = 0;
    if (du != null && du != '') {
        lDu = (Number(du) + fDu).toFixed(6);
    } else {
        lDu = fDu.toFixed(6);
    }
    alert10.lat = lDu;
}

/**
 * 添加跟随鼠标的图标
 */
function addImage() {
    let mv = document.createElement('img');
    mv = mv;
    mv.src = new URL('./img/coordinates.png', import.meta.url).href;
    mv.style.position = 'absolute';
    mv.style.left = '-100px';
    mv.style.top = '-100px';
    document.body.append(mv);

    document.onmousemove = function (e) {
        e = e || window.event;
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
function coordinatePoint(lon, lat) {
    window.earth.viewer3D.entities.removeById('coordinatePonint');
    addMarkEntity(lon, lat, degrees.height);
    window.earth.viewer3D.camera.flyTo({//定位过去
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 3000)
    });
}
/**
 * 坐标定位
 */
function coordinate() {
    remove();
    if (pccradio.value == 1) {
        if (coordinateSystem === 0) {
            coordinatePoint($refs.watchCoordinate.value, $refs.watchCoordinate2.value);
        } else if (coordinateSystem === 1) {
            coordinatePoint(gcto84.lon, gcto84.lat);
        } else if (coordinateSystem === 2) {
            coordinatePoint(bdto84.lon, bdto84.lat);
        }
    } else if (pccradio.value == 2) {
        coordinatePoint(alert10.lon, alert10.lat);
    } else if (pccradio.value == 3) {
        if (system === 0) {
            coordinatePoint(C3toDu.lon, C3toDu.lat);
        } else if (system === 1) {
            coordinatePoint($refs.watchCoordinate.value, $refs.watchCoordinate2.value);
        } else if (system === 2) {
            coordinatePoint(mctTo84.lon, mctTo84.lat);
        }
    }
}
function toCopy() {
    toClipboard(
        JSON.stringify({
            lon: alert10.lon,
            lat: alert10.lat,
            height: degrees.height
        }, null, 4)
        , () => {
            $message({
                message: '设备标识码 - 复制到粘贴板成功',
                type: 'success'
            });
        });
}

function beforeDestroy() {
    document.onmousemove = null;
}

</script>

<style lang="scss" scoped>
.radio.radio-inline {
    margin-top: 0;
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
