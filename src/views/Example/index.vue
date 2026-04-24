<template>
    <div id="headBar">
        <img src="./img.png" height="40" alt="logo" />
        <span class="head-text">CesiumEarth SDK 在线示例 <span class="head-version">（当前版本：{{ VERSION }}）</span></span>
    </div>
    <el-container class="tac">
        <el-container style="overflow: auto;height: 100%">
            <el-aside width="250px" style="height: 100%">
                <div class="left-menu">
                    <el-menu active-text-color="#ffd04b" background-color="#545c64" class="el-menu-vertical-demo"
                        text-color="#fff">
                        <el-sub-menu v-for="groupItem in menuList" :index="groupItem.group">
                            <template #title class="el-sub-menu-li">
                                <el-icon>
                                    <location />
                                </el-icon>
                                <span>{{ groupItem.group }}</span>
                            </template>
                            <el-menu-item v-for="menuItem in groupItem.list" :index="menuItem.name"
                                @click="handleClick(menuItem)">{{ menuItem.name
                                }}
                            </el-menu-item>
                        </el-sub-menu>
                    </el-menu>
                </div>
            </el-aside>
            <el-main style="padding: 0">
                <iframe id="demoIframe" ref="Sandbox" :src="iframeUrl"></iframe>
            </el-main>
        </el-container>
    </el-container>

</template>

<script lang="ts" setup>
import Viewer from '@/CesiumEarthUI/components/viewer/viewer.vue';
import { Delete, Edit, Refresh, Share } from '@element-plus/icons-vue';
import { computed, nextTick, onMounted, ref } from 'vue';
import * as Cesium from 'cesium'

const htmlList = ref<any[]>([])
const iframeUrl = ref('')

const ver = (Cesium as any).VERSION ?? 'unknown'
console.log(ver);

const VERSION = ref(CesiumEarth.ConfigTool.config.Version)
console.log(ver, VERSION.value);

onMounted(async () => {
    await loadHtmlList()
    // window.Sandbox = Sandbox.value

    // const demoPidParam = Number(router.params.demoPid as string | undefined)
    // if (Number.isFinite(demoPidParam) && htmlList.value.length) {
    //     openDemo(demoPidParam)
    // } else if (menuList.value.length && menuList.value[0].list.length) {
    //     openDemo(menuList.value[0].list[0].pid)
    // }
})
const menuList: any = computed(() => {
    const map = new Map<string, any[]>()
    for (const item of htmlList.value) {
        const arr = map.get(item.group)
        arr ? arr.push(item) : map.set(item.group, [item])
    }
    const out: any[] = []
    map.forEach((list, group) => out.push({ group, list }))
    return out
})
async function loadHtmlList() {
    const res = await fetch(`${(window as any).demoServer}/Demo/htmlList.json`)
    htmlList.value = await res.json()
}
import router from '@/router';
import CesiumEarth from '@/lib/CesiumEarth';
import type { AnyColumn } from 'element-plus/es/components/table-v2/src/common.mjs';
async function openDemo(pid: number) {
    iframeUrl.value = ''
    await nextTick()
    router.push({ name: 'example', params: { demoPid: pid } })
    iframeUrl.value = `./app/WebEditor/index.html?demo=${pid}`
    // 标签页标题
    // const found = htmlList.value.find(i => i.pid === pid)
    // if (found?.name) document.title = found.name
}
function handleClick(menuItem: { pid: number; }) {
    openDemo(menuItem.pid);
}
// function refresh() {
//     let url = iframeUrl.value;
//     iframeUrl.value = ''
//     await nextTick()
//     iframeUrl.value = url
// }


</script>

<style lang="scss" scoped>
#demoIframe {
    width: 100%;
    height: calc(100% - 51px);
    border: 0;
}


#headBar {
    height: 50px;
    background-color: #2c2e2f;
    padding: 5px 18px;
    display: flex;

    .head-text {
        padding: 5px;
        margin-left: -40px;
        font-size: 20px;
        color: #bdbdbd;
    }

    .head-version {
        font-size: 14px;
        color: #fcdba5;
    }
}

.tac {
    height: 100%;
}

.left-menu {
    height: calc(100% - 51px);
    overflow: auto;
    background-color: #545c64;
}

.el-sub-menu {
    border: rgba(192, 192, 192, 0.52) 1px solid;
}

.el-sub-menu:hover {
    background-color: #1E84F3;
}

.el-menu-item {
    border: rgba(192, 192, 192, 0.24) 1px solid;
    line-height: 38px;
    height: 38px
}

.tac :deep(.el-sub-menu__title) {
    height: 40px !important;
    line-height: 40px !important;
    background-color: #242934 !important;

}
</style>
