<template>
    <div class="header">
        <div v-show="isShowMenu" class="btns btn-left">
            <div v-for="item in titleHeader.left" class="title-btn">
                <a v-if="item.type === 'url'" :href="item.url" style="color: whitesmoke" target="_blank">{{ item.name
                }}</a>
                <a v-if="item.type === 'menu'" style="color: whitesmoke" target="_blank">{{ item.name }}</a>
                <a></a>
            </div>
        </div>
        <div class="title" style="width: 35%;text-align: center">{{ appName }}</div>
        <div v-show="isShowMenu" class="btns btn-right">
            <div v-for="item in titleHeader.right" class="title-btn">
                <a v-if="item.type === 'url'" :href="item.url" style="color: whitesmoke" target="_blank">{{ item.name
                }}</a>
                <a v-if="item.type === 'menu'" style="color: whitesmoke" target="_blank">{{ item.name }}</a>
                <a></a>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import CesiumEarth from '@/lib/CesiumEarth';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';
import { computed, onMounted, ref } from 'vue';
const ceStore = useCesiumEarthStore()


const themeColor = ref('green') // 支持换肤功能 green ：原始绿 yellow ：黄
const isShowMenu = ref(true)

const appName = computed(() => {
    return CesiumEarth.ConfigTool.config.appName
})
const titleHeader = computed(() => {
    return ceStore.titleHeader
})
onMounted(() => {
    window.addEventListener('resize', function () {
        isShowMenu.value = innerWidth > 850;
    });
    titleClickEvent();
})
function titleClickEvent() {
    const titleDoms = document.querySelectorAll('.title-btn');
    titleDoms.forEach(item => {
        item.addEventListener('click', function () {
            const preActive = document.querySelector('.active');
            if (preActive) {
                preActive.classList.remove('active');
            }
            item.classList.add('active');
        });
    });
}

</script>

<style lang='scss' scoped>
@use "../assets/css/common-theme.scss";
@use "../assets/css/green-theme.scss";
@use "../assets/css/yellow-theme.scss";
</style>
