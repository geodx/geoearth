<script setup lang="ts">
import { text } from '../locales';
import { RouterLink } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
</script>
<template><SiteHeader /><main id="main-content" class="not-found wrap"><p class="eyebrow">404 / NOT FOUND</p><h1>{{ text.notFoundTitle }}</h1><p>{{ text.notFoundDescription }}</p><RouterLink class="button primary" to="/">{{ text.returnHome }}</RouterLink></main><SiteFooter /></template>
<style scoped>.not-found { display: flex; align-items: flex-start; justify-content: center; flex-direction: column; min-height: calc(100vh - 240px); padding-block: 70px; }.not-found h1{font-size:36px;letter-spacing:-.04em;margin:15px 0}.not-found>p:not(.eyebrow){color:#94adbd;font-size:14px;margin:0 0 30px}</style>
