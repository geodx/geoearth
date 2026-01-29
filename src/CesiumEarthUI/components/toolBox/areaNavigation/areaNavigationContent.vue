<template>
    <div class="dark">
        <div class="title">
            <span>地区:</span>
            <span id="province">{{ provinceName }}</span>
            <span id="city"></span>
            <span id="district"></span>
            <i v-if="status !== 1" class="el-icon-top toBlack" @click="toBack()"></i>
        </div>
        <div class="city-list">
            <!--省-->
            <div v-if="provinceShow" id="city-table" class="city-table" style="display: block;">
                <table class="mars-primary-table">
                    <tbody>
                        <tr>
                            <th class="area" width="50">华北</th>
                            <th id="northChian" class="city" height="48">
                                <p @click="flyToProvince(110000)">北京</p>
                                <p @click="flyToProvince(120000)">天津</p>
                                <p @click="flyToProvince(130000)">河北</p>
                                <p @click="flyToProvince(140000)">山西</p>
                                <p @click="flyToProvince(150000)">内蒙古</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">东北</th>
                            <th id="northeastChain" class="city" height="48">
                                <p @click="flyToProvince(210000)">辽宁</p>
                                <p @click="flyToProvince(220000)">吉林</p>
                                <p @click="flyToProvince(230000)">黑龙江</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">华东</th>
                            <th id="eastChian" class="city" height="48">
                                <p @click="flyToProvince(310000)">上海</p>
                                <p @click="flyToProvince(320000)">江苏</p>
                                <p @click="flyToProvince(330000)">浙江</p>
                                <p @click="flyToProvince(340000)">安徽</p>
                                <p @click="flyToProvince(350000)">福建</p>
                                <p @click="flyToProvince(360000)">江西</p>
                                <p @click="flyToProvince(370000)">山东</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">华中</th>
                            <th id="centralChian" class="city" height="48">
                                <p @click="flyToProvince(410000)">河南</p>
                                <p @click="flyToProvince(420000)">湖北</p>
                                <p @click="flyToProvince(430000)">湖南</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">华南</th>
                            <th id="southChian" class="city" height="48">
                                <p @click="flyToProvince(440000)">广东</p>
                                <p @click="flyToProvince(450000)">广西</p>
                                <p @click="flyToProvince(460000)">海南</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">西南</th>
                            <th id="southwestChian" class="city" height="48">
                                <p @click="flyToProvince(500000)">重庆</p>
                                <p @click="flyToProvince(510000)">四川</p>
                                <p @click="flyToProvince(520000)">贵州</p>
                                <p @click="flyToProvince(530000)">云南</p>
                                <p @click="flyToProvince(540000)">西藏</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">西北</th>
                            <th id="northwestChian" class="city" height="48">
                                <p @click="flyToProvince(610000)">陕西</p>
                                <p @click="flyToProvince(620000)">甘肃</p>
                                <p @click="flyToProvince(630000)">青海</p>
                                <p @click="flyToProvince(640000)">宁夏</p>
                                <p @click="flyToProvince(650000)">新疆</p>
                            </th>
                        </tr>
                        <tr>
                            <th class="area">港澳台</th>
                            <th id="GAT" class="city" height="48">
                                <p @click="flyTaiwan(710000)">台湾</p>
                                <p @click="flyToProvince(810000)">香港</p>
                                <p @click="flyToProvince(820000)">澳门</p>
                            </th>
                        </tr>
                    </tbody>
                </table>
            </div>
            <!--市-->
            <div v-if="cityShow" id="city-list-item" class="city-list-item" style="display: block;">
                <p v-for="cityItem in cityFeatures" @click="flyToCity(cityItem)">{{ cityItem.properties.name }}</p>
            </div>
            <!--区-->
            <div v-if="areaShow" id="district-list-item" class="district-list-item" style="display: block;">
                <p v-for="areaItem in areaFeatures" @click="flyToArea(areaItem)">{{ areaItem.properties.name }}</p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import coordinateOffset from './lib/CoordinateOffset';
import CesiumEarth from '@/lib/CesiumEarth';
import { request } from '@/utils/Request';
import { useEarthStore } from '@/stores/EarthStore';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { Cartesian3, Color, Math } from 'cesium';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()


//当前状态1是省，2是市，3是区
const status = ref(1)
const provinceShow = ref(true)
const cityShow = ref(false)
const areaShow = ref(false)
const provinceName = ref('全国')

//省数组
let provinceFeatures: []
//市数组
const cityFeatures = ref<any[]>([])
//区数组
const areaFeatures = ref<any[]>([])
// 当前市级adcode
let cityAdcode = 0
// 当前区级adcode
let areaAdcode = 0
const municipality = new Set([
    '北京市', '上海市', '天津市', '香港特别行政区', '澳门特别行政区', '重庆市'
    , '密云区', '延庆区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '东城区', '西城区'
    , '和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '宁河区', '静海区', '蓟州区', '滨海新区'
    , '万州区', '涪陵区', '梁平区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '渝北区', '巴南区', '长寿区', '綦江区', '潼南区', '铜梁区', '大足区', '荣昌区', '璧山区', '城口县', '丰都县', '垫江县', '武隆区', '忠县', '开州区', '云阳县', '奉节县', '巫山县', '巫溪县', '黔江区', '石柱土家族自治县', '秀山土家族苗族自治县', '酉阳土家族苗族自治县', '彭水苗族土家族自治县', '江津区', '合川区', '永川区', '南川区'
    , '花地玛堂区', '圣安多尼堂区', '大堂区', '望德堂区', '风顺堂区', '路凼填海区', '嘉模堂区', '圣方济各堂区', '花王堂区'
    , '中西区', '湾仔区', '东区', '南区', '九龙城区', '油尖旺区', '观塘区', '黄大仙区', '深水埗区', '新界', '北区', '大埔区', '沙田区', '西贡区', '元朗区', '屯门区', '荃湾区', '葵青区', '离岛区'
    , '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'
])
//数据来源 https://datav.aliyun.com/portal/school/atlas/area_selector

const aLiYun = 'https://geo.datav.aliyun.com/areas_v3/bound/';

let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
})
function media(coordinates: any) {
    let c = JSON.parse(JSON.stringify(coordinates));
    for (let i = 0; i < coordinates.length; i++) {
        for (let j = 0; j < coordinates[i].length; j++) {
            for (let s = 0; s < coordinates[j].length; s++) {
                let result = coordinateOffset.gcj_decrypt_exact(coordinates[i][j][s][1], coordinates[i][j][s][0]);
                c[i][j][s][0] = result.lon;
                c[i][j][s][1] = result.lat;
                // console.log(result.lon,result.lat)
            }
        }
    }
    let entity = addPolygon(c);
    earth.viewer3D.flyTo(entity);
}
/**
 * 视角飞行时调用，增加矢量边界实体
 * @param coordinates 边界坐标数组
 */
function addPolygon(coordinates: any) {
    earth.viewer3D.entities.removeById('areaPolygon');
    let arr = [];
    for (let i = 0; i < coordinates[0][0].length; i++) {
        arr.push(coordinates[0][0][i][0]);
        arr.push(coordinates[0][0][i][1]);
    }
    let areaPolygon = earth.viewer3D.entities.add({
        id: 'areaPolygon',
        name: 'areaPolygon',
        polyline: {
            width: 12,
            positions: Cartesian3.fromDegreesArray(arr),
            material: new CesiumEarth.Material.Polyline.PolylineLinkPulseMaterial({
                color: Color.AQUA,
                duration: 5000
            }),
            clampToGround: true
        }
    });
    return areaPolygon;
}
/**
 * 飞行到省,加载市列表
 * @param adcode 请求json数据各个地区的编码
 */
function flyToProvince(adcode: any) {
    provinceShow.value = false;
    cityShow.value = true;
    areaShow.value = false;
    request.get(aLiYun + `100000.json`).then(res => {
        provinceFeatures = res.data.features;
        provinceFeatures.forEach((element: any) => {
            if (element.properties.adcode === adcode) {
                provinceName.value = element.properties.name;
                media(element.geometry.coordinates);
            }
        });
    });
    request.get(aLiYun + `${adcode}.json`).then(res => {
        cityFeatures.value = res.data.features;
        status.value = 2;
        cityAdcode = adcode;
    });
}
/**
 * 视角飞行市，加载区列表
 * @param cityInfo
 */
function flyToCity(cityInfo: any) {
    if (municipality.has(provinceName.value)) {
        request.get(aLiYun + `${cityInfo.properties.adcode}.json`).then(res => {
            // let entity = addPolygon(cityInfo.geometry.coordinates);
            // window.earth.viewer3D.flyTo(entity);// 飞向实体
            media(cityInfo.geometry.coordinates);
            provinceName.value = cityInfo.properties.name;
            areaAdcode = cityInfo.properties.adcode;
            status.value = 3;
        });
    } else {
        provinceName.value = cityInfo.properties.name;
        provinceShow.value = false;
        cityShow.value = false;
        areaShow.value = true;
        request.get(aLiYun + `${cityInfo.properties.adcode}.json`).then(
            res => {
                areaFeatures.value = res.data.features;
                // let entity = addPolygon(cityInfo.geometry.coordinates);
                // window.earth.viewer3D.flyTo(entity);// 飞向实体
                media(cityInfo.geometry.coordinates);
                areaAdcode = cityInfo.properties.adcode;
                status.value = 3;
            });
    }
}
/**
 * 视角飞行区
 * @param areaInfo
 */
function flyToArea(areaInfo: any) {
    provinceName.value = areaInfo.properties.name;
    request.get(aLiYun + `${areaInfo.properties.adcode}.json`).then(res => {
        areaFeatures.value = res.data.features;

        // let entity = addPolygon(areaInfo.geometry.coordinates);
        // window.earth.viewer3D.flyTo(entity);// 飞向实体
        media(areaInfo.geometry.coordinates);
        status.value = 4;
    });
}
/**
 * 视角飞行到台湾省，由于台湾下属不含区故单独调用函数
 * @param adcode
 */
function flyTaiwan(adcode: any) {
    provinceShow.value = true;
    cityShow.value = false;
    areaShow.value = false;
    request.get(aLiYun + `${adcode}.json`).then(res => {
        provinceFeatures = res.data.features;
        provinceFeatures.forEach((element: any) => {
            if (element.properties.adcode === adcode) {
                provinceName.value = element.properties.name;
                // let entity = addPolygon(element.geometry.coordinates);
                // window.earth.viewer3D.flyTo(entity);// 飞向实体
                media(element.geometry.coordinates);
            }
        });
    });
}
/**
 * 返回事件 市级
 * @param adcode
 */
function cityBack(adcode: any) {
    request.get(aLiYun + `${cityAdcode}.json`).then(res => {
        provinceFeatures = res.data.features;
        provinceFeatures.forEach((element: any) => {
            if (element.properties.adcode === adcode) {
                provinceName.value = element.properties.name;
                // let entity = addPolygon(element.geometry.coordinates);
                // window.earth.viewer3D.flyTo(entity);
                media(element.geometry.coordinates);
            }
        });
    });
    provinceShow.value = false;
    cityShow.value = true;
    areaShow.value = false;
    request.get(aLiYun + `${adcode}.json`).then(
        res => {
            areaFeatures.value = res.data.features;
            status.value = 3;
        });
}
/**
 * 返回上一层
 */
function toBack() {
    if (status.value === 2) {
        earth.viewer3D.entities.removeById('areaPolygon');
        //inintalView();//初始视角
        status.value = 1;
        provinceShow.value = true;
        cityShow.value = false;
        areaShow.value = false;
    } else if (status.value === 3) {
        status.value = 2;
        flyToProvince(cityAdcode);
    } else if (status.value === 4) {
        status.value = 3;
        cityBack(areaAdcode);
    }
}
/**
 * 初始视角
 */
function inintalView() {
    earth.viewer3D.camera.flyTo({
        destination: Cartesian3.fromDegrees(117.30, 42.40, 10000.0),
        orientation: {
            pitch: Math.toRadians(-35.0)
        }
    });
} 
</script>

<style lang="scss" scoped>
.dark a {
    color: #fff;
    text-decoration: none;
    margin-top: 1px;
    margin-right: 2px;
}

.dark {
    overflow: hidden;
    color: #fff;
}

.title {
    margin-top: 10px;
    border-bottom: 1px #0ff solid;
}

.fa {
    display: inline-block;
    font: normal normal normal 14px/1 FontAwesome;
    font-size: inherit;
    text-rendering: auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.toBlack {
    position: absolute;
    right: 15px;
    cursor: pointer;
    color: white;
    width: 0;
    height: 0;
    border-right: 7px solid #ccc;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
}

.city-list {
    padding: 10px 5px;
}

.area {
    color: #0ff;
}

.city p,
.city-list-item p,
.district-list-item p {
    display: inline;
    padding-left: 4px;
    font-weight: 400;
    margin: 0 0 6px;
    cursor: pointer;
    float: left;
}
</style>
