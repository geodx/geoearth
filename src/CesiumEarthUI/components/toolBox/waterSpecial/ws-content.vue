<template>
    <win-tabs style="width: 350px;left:auto;right: 200px" @close="close">
        <tab-pane label="水面波纹配置">
            <table>
                <tr>
                    <td>颜色 R：</td>
                    <td style="text-align: left">
                        <el-color-picker v-model="color" show-alpha size="small" @change="save"></el-color-picker>
                    </td>
                </tr>
                <tr>
                    <td>波纹频率：</td>
                    <td><input v-model="water_freq" max="200" min="0" step="1" type="range" @change="save"></td>
                </tr>
                <tr>
                    <td>波动速度：</td>
                    <td><input v-model="water_animationspeed" max="0.01" min="0.001" step="0.001" type="range"
                            @change="save"></td>
                </tr>
                <tr>
                    <td>波动高度：</td>
                    <td><input v-model="water_amplitude" max="5" min="1" step="0.1" type="range" @change="save"></td>
                </tr>
                <tr>
                    <td>水体高度：</td>
                    <td>
                        <el-input v-model="height" size="small" @change="save"></el-input>
                    </td>
                </tr>
            </table>
            <br>
            <div style="text-align: center">
                <el-button size="small" style="margin-left: 10px" type="success" @click="save">保存</el-button>
                <el-button size="small" type="danger" @click="close">退出</el-button>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { TabPane, WinTabs } from '../../winTabs'
import type CesiumEarth from '@/lib/CesiumEarth'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore'
import { useEarthStore } from '@/stores/EarthStore'

const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()

let earth: CesiumEarth.Earth

const color = ref('rgba(0, 75.3, 53.2, 0.7)')

const color_r = ref(0.0)  // 颜色R
const color_g = ref(0.2941177)       // 颜色G
const color_b = ref(0.2078431)     // 颜色B
const color_a = ref(1)   // 透明度
const water_freq = ref(100.0)   // 波纹频率
const water_animationspeed = ref(0.01)   // 波动速度
const water_amplitude = ref(2.0)    // 波动高度
const height = ref(1)

watch(() => color.value, (newValue, oldValue) => {
    let colorArr = newValue.replace('rgba(', '').replace(')', '').replace(' ', '').split(',');
    color_r.value = Number(colorArr[0]) / 256;
    color_g.value = Number(colorArr[1]) / 256;
    color_b.value = Number(colorArr[2]) / 256;
    color_a.value = Number(colorArr[3]);
})
function save() {
    setTimeout(async () => {
        earth = await earthStore.getEarth()
        let options = earth.viewer3DWorkSpace.waterManage.options;

        !isNaN(color_r.value) && (options.red = color_r.value);
        !isNaN(color_g.value) && (options.green = color_g.value);
        !isNaN(color_b.value) && (options.blue = color_b.value);
        !isNaN(color_a.value) && (options.alpha = color_a.value);
        !isNaN(water_freq.value) && (options.frequency = water_freq.value);
        !isNaN(water_animationspeed.value) && (options.animationSpeed = water_animationspeed.value);
        !isNaN(water_amplitude.value) && (options.amplitude = water_amplitude.value);
        !isNaN(height.value) && (options.height = height.value);

        earth.viewer3DWorkSpace.waterManage.reLoad();
    }, 100);
}
function close() {
    ceStore.setCesiumEarthComAction('waterSpecial', 2)
} 
</script>

<style lang="scss" scoped>
table {
    color: #009b94;
    font-size: 14px;

    tr {
        height: 35px;
    }
}
</style>
