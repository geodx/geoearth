<template>
    <div class="attr-panel">
        <div class="attr-panel-header">
            <!--      <span class="attr-panel-header-title">属性编辑</span>-->
        </div>
        <div class="attr-panel-body">
            <el-form ref="form" label-width="100px" size="small">
                <el-form-item label="粒子数量">
                    <el-slider v-model="emissionRate" :max="1000" :min="0" @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="粒子大小">
                    <el-slider v-model="particleSize" :max="60.0" :min="0" :step="1" @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="最小生命周期">
                    <el-slider v-model="minimumParticleLife" :max="5.0" :min="0.1" :step="0.2"
                        @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="最大生命周期">
                    <el-slider v-model="maximumParticleLife" :max="5.0" :min="0.1" :step="0.2"
                        @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="最小速度">
                    <el-slider v-model="minimumSpeed" :max="30.0" :min="0.0" :step="1"
                        @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="最大速度">
                    <el-slider v-model="maximumSpeed" :max="30.0" :min="0.0" :step="1"
                        @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="初始比例">
                    <el-slider v-model="startScale" :max="10.0" :min="0.0" :step="1" @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="终止比例">
                    <el-slider v-model="endScale" :max="10.0" :min="0.0" :step="1" @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item label="重力">
                    <el-slider v-model="gravity" :max="20" :min="-20" :step="0.1" @change="updateStyle"></el-slider>
                </el-form-item>

                <el-form-item>
                    <!--          <div style=" text-align: right">-->
                    <!--            <el-button type="danger" @click="delClickEvent">删除粒子</el-button>-->
                    <!--          </div>-->
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import particleStore from './particleStore';
const endScale = ref(0)
const emissionRate = ref(0)
const particleSize = ref(0)
const minimumParticleLife = ref(0)
const maximumParticleLife = ref(0)
const minimumSpeed = ref(0)
const maximumSpeed = ref(0)
const startScale = ref(0)
const gravity = ref(0)

onMounted(() => {
    emissionRate.value = particleStore.selectedPlot.style.emissionRate;
    particleSize.value = particleStore.selectedPlot.style.particleSize;
    minimumParticleLife.value = particleStore.selectedPlot.style.minimumParticleLife;
    maximumParticleLife.value = particleStore.selectedPlot.style.maximumParticleLife;
    minimumSpeed.value = particleStore.selectedPlot.style.minimumSpeed;
    maximumSpeed.value = particleStore.selectedPlot.style.maximumSpeed;
    startScale.value = particleStore.selectedPlot.style.startScale;
    endScale.value = particleStore.selectedPlot.style.endScale;
    gravity.value = particleStore.selectedPlot.style.gravity;
})


function updateStyle() {
    updateValue();
    particleStore.selectedPlot.updateStyle(particleStore.selectedPlot.style);//更新粒子参数 
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
    particleStore.selectedPlot.style.gravity = gravity.value;
}


</script>

<style lang="scss" scoped>
.attr-panel-body :deep(.el-form-item--mini.el-form-item),
.attr-panel-body :deep(.el-form-item--small.el-form-item) {
    margin-bottom: 0;
}
</style>
