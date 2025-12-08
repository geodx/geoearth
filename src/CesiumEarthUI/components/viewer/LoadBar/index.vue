<template>
    <div v-if="false" id="loadBar">
        <span v-for="item in loadList" :key="item.id">
            <span v-if="item.numberOfPendingRequests">
                {{ item.name }}载入， 需要加载瓦片数据包: {{ item.numberOfPendingRequests }} 个
            </span>
        </span>
    </div>
</template>
<script lang="ts" setup>
import type { Earth } from '@/lib/cesium-earth/ts/Earth';
import { useEarthStore } from '@/lib/cesium-earth/ts/Earth/lib/EarthStore';
import { onMounted, ref } from 'vue';
interface LoadItem {
    id: any            //或string,按你实际改
    numberOfPendingRequests: any
    name: any
}
const loadList = ref<LoadItem[]>([])
onMounted(() => {
    const earth: Earth = useEarthStore().getEarth()
    earth.thenLoadComplete().then(() => {
        earth.viewer3DWorkSpace._3DTileManage.loadTileCallFunMap.set('LoadBarVue', (s: any, numberOfPendingRequests: any) => {
            loadList.value = loadList.value.filter(item => item.id !== s.pid);
            loadList.value.push({ id: s.pid, name: s.name, numberOfPendingRequests }
            );
        });
    });
})

</script>


<style lang="scss" scoped>
#loadBar {
    position: absolute;
    bottom: 10px;
    padding: 5px;
    left: 30px;
    border-radius: 5px;
    border: rgba(245, 222, 179, 0.4) 1px solid;
    background-color: rgba(33, 45, 33, 0.4);
    color: sandybrown;
    flex-direction: column;
    font-size: 16px;
}
</style>
