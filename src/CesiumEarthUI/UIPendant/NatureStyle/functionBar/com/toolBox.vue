<template>
    <div v-if="show" id="tool" class="tool">
        <div :class="{ 'tool-btn': true, 'tool-double': toolList.length > 6 }"
            :style="{ width: toolList.length > 11 ? '220px' : '120px' }">
            <div v-for="item in toolList" :class="{ 'tool-selected': selItem === item.name }"
                :style="item.comName ? '' : 'cursor:not-allowed;'" style="padding:0 10px;margin: 1px"
                @click="toggleActive(item)">
                <img v-if="item.config.iconUrl" :src="item.config.iconUrl">
                <b v-if="item.config.iconClass" :class="'iconfont icon-' + item.config.iconClass"
                    style="color: white"></b>
                <span style="display:inline-block;width:56px;text-align: left">{{ item.name }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { computed, ref, watch } from 'vue';
const ceStore = useCesiumEarthStore()
const toolList = ref<any[]>([])
const selItem = ref('')

const show = computed(() => { return ceStore.comStatus('toolBox') })
const comActions = computed(() => {
    return ceStore.comActions.filter(item =>
        item.type === 'ToolBoxItem' && item.config.inToolBox === true
    );
})
// mounted(){
//   // 读取历史更改的插件
//   let VGEConfig = localStorage.getItem('VGEConfig');
//   VGEConfig = VGEConfig ? JSON.parse(VGEConfig) : null;
//   if (VGEConfig && VGEConfig.Version === CesiumEarth.ConfigTool.config.Version) {
//       this.$store.commit("readCom", VGEConfig.comActions)
//   }
// },
watch(
    comActions,
    (val) => {
        toolList.value = val
    },
    { deep: true, immediate: true }
)

function toggleActive(ToolBoxItem: any) {
    // 验证是否为点击事件，是则继续执行click事件，否则不执行
    let isClick = document.getElementById('tool')?.getAttribute('data-flag');
    if (isClick !== 'false') {
        switch (ToolBoxItem.type) {
            case 'ToolBoxItem':
                toolList.value.forEach(element => {
                    if (element.comName === ToolBoxItem.comName) {
                        ceStore.setCesiumEarthComAction(ToolBoxItem.comName, 3)
                    } else if (element.comName) {
                        ceStore.setCesiumEarthComAction(element.comName, 2)
                    }
                });
                break;
            case 'ZhiBei':
                ceStore.setCesiumEarthComAction(ToolBoxItem.comName, 3)
                break;
        }
    }

    selItem.value = ToolBoxItem.name;
}

</script>



<style lang="scss" scoped>
@use "../../assets/css/common-theme.scss";
@use "../../assets/css/green-theme.scss";
@use "../../assets/css/yellow-theme.scss";

.tool-double {
    width: 220px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
}
</style>
