<template>
    <win-tabs v-if="true" :initCSS="{ width: 370, height: 560, left: 900, top: 30 }" @close="close">

        <button @click="reSetWeather">获取天气</button>
        <tab-pane :label="'实时天气&nbsp;' + time + '&nbsp;'">
            <div class="modal-body" style="padding: 0;overflow-x: hidden;">
                <!-- <iframe :src=h5Url frameborder="no" height="450" marginheight="0" marginwidth="0" width="345"></iframe> -->
                {{ h5Url }}
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { TabPane, WinTabs } from '../../winTabs'
import { computed, onMounted, ref } from 'vue';
import CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
const ceStore = useCesiumEarthStore()
const earthStore = useEarthStore()
const time = getNowFormatDate()
const h5Url = ref()
const show = computed(() => {
    let s = ceStore.comStatus('weather');
    if (s) {
        reSetWeather();
    }
    return s;
})
const props = defineProps(['lat', 'lon'])
const key = 'e4f2b99de28e48bfa0f5f1a45afedebf';
// 获取当前时间
function getNowFormatDate() {
    const date = new Date();
    const seperator1 = '-';
    const seperator2 = ':';
    const month = date.getMonth() + 1;
    const strDate = date.getDate();
    let monthStr = ""
    if (month >= 1 && month <= 9) {
        monthStr = '0' + month;
    }
    let dateStr = ""
    if (strDate >= 0 && strDate <= 9) {
        dateStr = '0' + strDate;
    }
    const currentdate = date.getFullYear() + seperator1 + monthStr + seperator1 + dateStr
        + ' ' + date.getHours() + seperator2 + date.getMinutes()
        + seperator2 + date.getSeconds();
    return currentdate;
}
// 刷新位置
async function reSetWeather() {
    let cityInfo = await getCityByLonLat();
    // h5Url.value = cityInfo.fxLink;
    const response = await fetch(new URL('https://geoapi.qweather.com//v7/weather/now?key=' + key + '&location=' + cityInfo.id, import.meta.url))
    const weather = await response.json()


    h5Url.value = weather.now;
}
async function getCityInfo(cityName = '万州') {
    const response = await fetch(new URL('https://geoapi.qweather.com/v2/city/lookup?key=' + key + '&location=' + cityName, import.meta.url))
    const cityInfo = await response.json()
    return cityInfo.data.location[0];
}
async function getCityByLonLat() {
    const earth = await earthStore.getEarth()
    const worldPoint = CesiumEarth.CameraUtils.getScreenCenterPoint(earth.viewer3D);
    const response = await fetch(new URL('https://geoapi.qweather.com/v2/city/lookup?key=' + key + '&location=' + worldPoint?.longitude + ',' + worldPoint?.latitude, import.meta.url))
    const cityInfo = await response.json()
    return cityInfo.location[0];
}
function close() {
    ceStore.setCesiumEarthComAction('weather', 2)
}

</script>
