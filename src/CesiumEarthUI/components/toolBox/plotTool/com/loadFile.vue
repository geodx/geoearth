<template>
    <div>
        <div class="padding-top">
            <span style="display:inline-block;overflow: hidden;text-overflow:ellipsis;white-space: nowrap;width: 180px">
                本地文件：{{ fileName }}</span>
            <el-button @click="inputFileData" style="margin-top: -4px;margin-left: 20px;" type="success" size="small">
                <i class="iconfont icon-earth-wenjianjia"></i>导入</el-button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useEarthStore } from '@/stores/EarthStore';
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
const fileName = ref('')
const earthStore = useEarthStore()
// 导入 xml 或者 GeoJson。弹出文件选择窗口，并将选文件保存入 全局变量
async function inputFileData() {
    const earth = await earthStore.getEarth()
    earth.plotTool.inputFileData({
        endFunc: (msg: string) => ElMessage({
            message: msg,
            type: 'success',
        }),
        errFunc: (fileNameE: string) => {
            fileName.value = fileNameE;
            ElMessage({ message: '文件载入成功：' + fileName, type: 'warning' });
        }
    });
}
</script>
