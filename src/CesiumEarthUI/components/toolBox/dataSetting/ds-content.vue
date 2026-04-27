<template>
    <win-tabs style="left:auto;right: 200px" @close="close">
        <tab-pane label="数据参数">
            <div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">模型</label></el-col>
                        <el-col :span="16">
                            <el-select v-model="selTileSetPid" placeholder="请选择" size="small">
                                <el-option v-for="item in tileSetList" :key="item.pid" :label="item.name"
                                    :value="item.pid">
                                </el-option>
                            </el-select>
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">比例：</label></el-col>
                        <el-col :span="16">
                            <input v-model.number="opts.scale" :max="100" :min="0.1" :step="0.1" type="number"
                                @input="update3DTilesMatrix()" />
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">经度：</label></el-col>
                        <el-col :span="16">
                            <input v-model.number="opts.longitude" :step="0.001" type="number"
                                @input="update3DTilesMatrix()" />
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">纬度：</label></el-col>
                        <el-col :span="16">
                            <input v-model.number="opts.latitude" :step="0.001" type="number"
                                @input="update3DTilesMatrix()" />
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">高度：</label></el-col>
                        <el-col :span="16">
                            <el-slider v-model="opts.height" :max="1000" :min="-100"
                                @input="update3DTilesMatrix"></el-slider>
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">以x轴旋转</label></el-col>
                        <el-col :span="16">
                            <el-slider v-model="opts.rx" :max="100" :min="-100"
                                @input="update3DTilesMatrix"></el-slider>
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">以y轴旋转</label></el-col>
                        <el-col :span="16">
                            <el-slider v-model="opts.ry" :max="100" :min="-100"
                                @input="update3DTilesMatrix"></el-slider>
                        </el-col>
                    </el-row>
                </div>
                <div style="margin-bottom: 5px">
                    <el-row>
                        <el-col :span="8"><label class="label-container">以z轴旋转</label></el-col>
                        <el-col :span="16">
                            <el-slider v-model="opts.rz" :max="100" :min="-100"
                                @input="update3DTilesMatrix"></el-slider>
                        </el-col>
                    </el-row>
                </div>

                <div style="text-align: center;padding-top: 10px">
                    <el-button size="small">定位</el-button>
                    <el-button size="small" @click="saveOpts()">保存参数</el-button>
                </div>
            </div>
        </tab-pane>
    </win-tabs>
</template>

<script lang="ts" setup>
import { useEarthStore } from '@/stores/EarthStore'
import { TabPane, WinTabs } from '../../winTabs'
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore'
import CesiumEarth from '@/lib/CesiumEarth'
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ResourceItem } from '@/lib/CesiumEarth/ts/Config/ResourceItem'
const earthStore = useEarthStore()
const ceStore = useCesiumEarthStore()

const selTileSetPid = ref()
const tileSetList = ref<ResourceItem[]>([])
const opts = ref({
    scale: 1.0,
    longitude: 0,
    latitude: 0,
    height: 0, //修改高度
    rx: 0,
    ry: 0,
    rz: 0 //修改旋转
})

let earth: CesiumEarth.Earth
onMounted(async () => {
    earth = await earthStore.getEarth()
    tileSetList.value = earth.viewer3DWorkSpace.getNodes().filter((item: ResourceItem) => item.dataType === 'Cesium3DTile');

})
function update3DTilesMatrix() {
    const tileSet = earth.viewer3DWorkSpace._3DTileManage.getInstancesByPid(selTileSetPid.value);
    if (tileSet) {
        let tileSetEditor = new CesiumEarth.TileSetPlugin.PositionEditor(earth.viewer3D, tileSet);
        opts.value = tileSetEditor.getParams();
    }
}

function saveOpts() {
    console.log(opts.value);
    ElMessage({
        message: JSON.stringify(opts.value),
        type: 'success'
    });
}
function close() {
    ceStore.setCesiumEarthComAction('dataSetting', 2)

}
</script>
<style lang="scss" scoped>
label {
    color: #009b94;
}
</style>
