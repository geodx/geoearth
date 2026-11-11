<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { sourceUrl } from '../config';
</script>

<template>
  <footer class="site-footer wrap">
    <RouterLink class="footer-wordmark" to="/"><img src="/favicon.svg" width="25" height="25" alt="" />GeoEarth</RouterLink>
    <p>用更少的代码，构建三维地理应用。</p>
    <nav aria-label="页尾导航"><a :href="sourceUrl" target="_blank" rel="noopener noreferrer">GitHub</a><RouterLink to="/docs/getting-started">文档</RouterLink><a :href="sourceUrl + '/issues'" target="_blank" rel="noopener noreferrer">反馈</a></nav>
    <small>© {{ new Date().getFullYear() }} GeoEarth · Apache-2.0</small>
  </footer>
</template>

<style scoped>
.site-footer { display: grid; grid-template-columns: auto 1fr auto; gap: 14px 30px; align-items: center; padding-block: 31px; border-top: 1px solid #c2dce015; }
.footer-wordmark { display: inline-flex; align-items: center; gap: 8px; color: #eaf4f8; font-size: 19px; font-weight: 700; text-decoration: none; }
p { color: #8396a7; font-size: 12px; }
nav { display: flex; gap: 25px; font-size: 12px; }
nav a { color: #c0ccd5; text-decoration: none; }
nav a:hover { color: #67e8f9; }
small { grid-column: 1 / -1; color: #61798a; font-size: 11px; }
@media(max-width: 600px) { .site-footer { grid-template-columns: 1fr auto; gap: 13px; } p { grid-column: 1 / -1; grid-row: 2; margin: 0; } }
</style>
