<template>
    <div>
        <div style="padding-top: 15px">
            材质：
            <el-select v-model="polygonMaterialIndex" clearable placeholder="请选择" size="small" style="width: 215px"
                @change="changeSymbol">
                <el-option v-for="(item, index) in polygonMaterials" :key="item.label" :label="item.label"
                    :value="index">
                    <span style="float: left">{{ item.label }}</span>
                </el-option>
            </el-select>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
const emit = defineEmits(['setDrawObj'])
const polygonMaterialIndex = ref(0)
const polygonMaterials = ref([
    { label: '普通', type: 'normal', url: '' }
])
onMounted(() => {
    changeSymbol()
})
function changeSymbol() {
    const pointItem = polygonMaterials.value[polygonMaterialIndex.value];
    if (pointItem) {
        emit('setDrawObj',
            {
                image: pointItem.url,
                name: pointItem.label,
                label: pointItem.label,
                type: 'polygonEntity'
            }
        )
    }
}

</script>

<style lang="scss" scoped></style>
