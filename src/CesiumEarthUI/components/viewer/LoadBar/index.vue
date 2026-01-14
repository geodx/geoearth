<template>
    <div v-if="true" id="loadBar">
        <span v-for="item in loadList" :key="item.id">
            <span v-if="item.numberOfPendingRequests">
                {{ item.name }}载入， 需要加载瓦片数据包: {{ item.numberOfPendingRequests }} 个
            </span>
        </span>
    </div>
</template>
<script lang="ts" setup>
import type CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { onMounted, ref } from 'vue';
const earthStore = useEarthStore()

interface LoadItem {
    id: any
    numberOfPendingRequests: any
    name: any
}
const loadList = ref<LoadItem[]>([])
onMounted(async () => {

    const earth: CesiumEarth.Earth = await earthStore.getEarth()
    earth.thenLoadComplete().then(() => {
        earth.viewer3DWorkSpace._3DTileManage.loadTileCallFunMap.set('LoadBarVue', (s: any, numberOfPendingRequests: any) => {
            loadList.value = loadList.value.filter(item => item.id !== s.pid);
            loadList.value.push({ id: s.pid, name: s.name, numberOfPendingRequests });
            console.log("loadList：", loadList.value);
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
