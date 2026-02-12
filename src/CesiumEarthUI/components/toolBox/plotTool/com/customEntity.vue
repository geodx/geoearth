<template>
    <div>
        <div style="padding-top: 15px">
            分组：
            <el-cascader v-model="selGroup" :options="groupList"
                :props="{ value: 'groupName', label: 'groupName', children: 'childrens' }" clearable size="small"
                style="width: 180px" @change="changeGroup">
            </el-cascader>
        </div>
        <div style="padding-top: 15px">
            符号：
            <el-select v-model="selPlotCode" size="small" @change="changePlot" style="width: 120px">
                <el-option v-for="item in plotList" :key="item.code" :label="item.name" :value="item.code" clearable>
                </el-option>
            </el-select>
        </div>

        <div v-if="selPlot">
            <div v-for="item in selPlot.paramList">
                <div style="padding-top: 10px">
                    {{ item.name }}：
                    <el-select v-if="item.select instanceof Array" v-model="item.value" size="small"
                        style="width: 160px;">
                        <el-option v-for="item2 in item.select" :key="item2.key" :label="item2.label"
                            :value="item2.value" clearable>
                        </el-option>
                    </el-select>
                    <el-input v-else v-model="item.value" :placeholder="item.placeholder || ''" size="small"
                        style="width: 190px" @input="setOption(item)">
                    </el-input>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'

const selGroup = ref('信息弹框')
const groupList = ref<any[]>([])
const plotList = ref<any[]>([])
const selPlotCode = ref()
const selPlot = ref()
const emit = defineEmits(['setDrawObj'])
onMounted(async () => {
    const { data: customPlotList } = await axios.get('CesiumEarth/plotTool/custom/plotList.json');
    groupList.value = customPlotList;
    emit('setDrawObj', null);
    changeGroup(['信息弹框']);
})
const selPlotStr = computed(() => {
    return JSON.stringify(selPlot.value || {});
})
watch(() => selPlotStr, (newValue, oldValue) => {
    emit('setDrawObj', JSON.parse(selPlotStr.value));
})
function getPlotByCode(code: string) {
    let plot: any;
    groupList.value.forEach(({ plotList }) => {
        plot = plot || plotList.find((plotItem: any) => plotItem.code === code);
    });
    return plot;
}
// 为实体添加文字标注
function setOption(e: any) {
    if (e.defaultLabel) {
        selPlot.value.name = e.value;
    }
}

// 切换标绘组
function changeGroup(groupArr: any) {
    selPlotCode.value = null;
    selPlot.value = null;
    plotList.value = [];
    let group: any;
    groupArr = JSON.parse(JSON.stringify(groupArr));
    while (groupArr.length) {
        let groupName = groupArr.shift();
        group = groupList.value.find((item: any) => item.groupName === groupName)!;
        if (group && groupArr.length === 0) {
            plotList.value = group.plotList;
            changePlot(plotList.value[0].code);
        }
    }
}

// 切换标绘项
function changePlot(selPlotCodeStr: string) {
    if (selPlotCodeStr === undefined) return;
    let selPlotObj = getPlotByCode(selPlotCodeStr);
    if (!selPlotObj) return;

    selPlotCode.value = selPlotCodeStr;
    selPlot.value = JSON.parse(JSON.stringify(selPlotObj));
    selPlot.value.paramList = selPlot.value.paramList || [];
    selPlot.value.paramList.forEach((item: any) => {
        if (item.defaultLabel) {
            selPlot.value.name = item.value || selPlot.value.name;
        }
    });
    emit('setDrawObj', selPlotObj);
}

</script>

<style lang="scss" scoped></style>
