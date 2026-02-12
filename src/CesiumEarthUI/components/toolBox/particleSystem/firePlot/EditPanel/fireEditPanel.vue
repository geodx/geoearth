<template>
    <div class="attr-panel">
        <div class="attr-panel-header">
            <br />
            <!--      <span class="attr-panel-header-title">属性编辑</span>-->
        </div>
        <div class="attr-panel-body">
            <el-form ref="form" label-width="100px" size="small">

                <el-form-item label="粒子数量">
                    <el-slider v-model="emissionRate" :max="201" :min="0" :step="1" @input="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="粒子大小">
                    <el-slider v-model="particleSize" :max="60.0" :min="0" :step="1" @change="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="最小生命周期">
                    <el-slider v-model="minimumParticleLife" :max="5.0" :min="0.1" :step="0.2" @change="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="最大生命周期">
                    <el-slider v-model="maximumParticleLife" :max="5.0" :min="0.1" :step="0.2" @change="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="最小速度">
                    <el-slider v-model="minimumSpeed" :max="30.0" :min="0.0" :step="1" @change="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="最大速度">
                    <el-slider v-model="maximumSpeed" :max="30.0" :min="0.0" :step="1" @change="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="初始比例">
                    <el-slider v-model="startScale" :max="5.0" :min="0.0" :step="0.5" @input="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item label="终止比例">
                    <el-slider v-model="endScale" :max="10.0" :min="0.0" :step="1" @change="updateStyle"
                        @mousedown="handleMouseDown" @mouseup="handleMouseUp"></el-slider>
                </el-form-item>

                <el-form-item>
                    <!--            <div style=" text-align: right">-->
                    <!--              <el-button type="danger" @click="delClickEvent">删除粒子</el-button>-->
                    <!--            </div>-->
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import particleStore from './particleStore';
const endScale = ref(1.5)
const emissionRate = ref(200)
const particleSize = ref(2)
const minimumParticleLife = ref(1.5)
const maximumParticleLife = ref(1.8)
const minimumSpeed = ref(7)
const maximumSpeed = ref(9)
const startScale = ref(3)
const isDragging = ref(false)

const emit = defineEmits(['changeKey'])
onMounted(() => {
    emissionRate.value = particleStore.selectedPlot.style.emissionRate;
    particleSize.value = particleStore.selectedPlot.style.particleSize;
    minimumParticleLife.value = particleStore.selectedPlot.style.minimumParticleLife;
    maximumParticleLife.value = particleStore.selectedPlot.style.maximumParticleLife;
    minimumSpeed.value = particleStore.selectedPlot.style.minimumSpeed;
    maximumSpeed.value = particleStore.selectedPlot.style.maximumSpeed;
    startScale.value = particleStore.selectedPlot.style.startScale;
    endScale.value = particleStore.selectedPlot.style.endScale;
})

function updateStyle() {
    updateValue();
    // console.log(particleStore.selectedPlot.style)
    particleStore.selectedPlot.updateStyle(particleStore.selectedPlot.style);//更新粒子参数
    // console.log(particleStore.selectedPlot)
}
//改变粒子参数
function updateValue() {
    particleStore.selectedPlot.style.emissionRate = emissionRate.value;
    particleStore.selectedPlot.style.particleSize = particleSize.value;
    particleStore.selectedPlot.style.minimumParticleLife = minimumParticleLife.value;
    particleStore.selectedPlot.style.maximumParticleLife = maximumParticleLife.value;
    particleStore.selectedPlot.style.minimumSpeed = minimumSpeed.value;
    particleStore.selectedPlot.style.maximumSpeed = maximumSpeed.value;
    particleStore.selectedPlot.style.startScale = startScale.value;
    particleStore.selectedPlot.style.endScale = endScale.value;
}
/**鼠标按下时窗口不可被拖动**/
function handleMouseDown() {
    emit('changeKey', false);
}
/**鼠标松开恢复**/
function handleMouseUp() {
    emit('changeKey', true);
}
//根据plotCode删除单个粒子
// delClickEvent() {
//   $emit("delClickEvent", plot.properties.plotCode);
// }

</script>

<style lang="less" scoped>
.attr-panel-body :deep(.el-form-item--mini.el-form-item),
.attr-panel-body :deep(.el-form-item--small.el-form-item) {
    margin-bottom: 0;
}
</style>
