<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { exampleUrl, sourceUrl, adminUrl } from '../config';
import SiteIcon from './SiteIcon.vue';

const route = useRoute();
const open = ref(false);
const projects = ref<HTMLDetailsElement>();
watch(() => route.fullPath, () => { open.value = false; if (projects.value) projects.value.open = false; });
</script>

<template>
  <a class="skip-link" href="#main-content">跳转到内容</a>
  <header class="site-header" @keydown.esc="open = false">
    <div class="header-inner wrap">
      <RouterLink to="/" class="wordmark" aria-label="GeoEarth 首页">
        <img src="/favicon.svg" width="31" height="31" alt="" /><span>GeoEarth</span>
      </RouterLink>
      <button class="menu-button" type="button" :aria-expanded="open" aria-controls="site-navigation" :aria-label="open ? '收起导航' : '展开导航'" @click="open = !open">
        <SiteIcon :name="open ? 'close' : 'menu'" />
      </button>
      <nav id="site-navigation" class="site-navigation" :class="{ open }" aria-label="网站导航">
        <RouterLink :to="{ path: '/', hash: '#capabilities' }">功能</RouterLink>
        <a :href="exampleUrl()" target="_blank" rel="noopener noreferrer">在线示例<SiteIcon name="external" /></a>
        <RouterLink to="/docs/getting-started" :class="{ active: route.name === 'docs' }">开发文档</RouterLink>
        <details ref="projects" class="projects-menu">
          <summary>更多项目<SiteIcon name="chevron" /></summary>
          <div class="projects-popover">
            <a :href="adminUrl" target="_blank" rel="noopener noreferrer"><strong>Admin Platform<SiteIcon name="external" /></strong><span>业务系统开发平台</span></a>
          </div>
        </details>
        <a class="github-link" :href="sourceUrl" target="_blank" rel="noopener noreferrer"><SiteIcon name="github" />GitHub</a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.skip-link { position: fixed; top: -60px; left: 16px; z-index: 100; padding: 12px; background: #54e5f2; color: #06101b; }
.skip-link:focus { top: 12px; }
.site-header { position: sticky; top: 0; z-index: 40; border-bottom: 1px solid #83bad00d; background: #06101bea; backdrop-filter: blur(18px); }
.header-inner { display: flex; align-items: center; justify-content: space-between; min-height: 78px; gap: 28px; }
.wordmark { display: inline-flex; align-items: center; gap: 10px; color: #f4f9fc; font-size: 25px; font-weight: 750; letter-spacing: -.9px; text-decoration: none; }
.site-navigation { display: flex; align-items: center; gap: 32px; font-size: 13px; }
.site-navigation > a, summary { color: #b9c7d4; text-decoration: none; white-space: nowrap; }
.site-navigation > a:hover, .site-navigation > a.active, summary:hover { color: #67e8f9; }
.site-navigation a { display: inline-flex; align-items: center; gap: 6px; }
.site-navigation a > svg { width: 13px; height: 13px; }
.site-navigation .github-link { padding: 8px 13px; border: 1px solid #2a3c4d; border-radius: 5px; color: #e9f0f5; }
.site-navigation .github-link svg { width: 16px; height: 16px; }
.projects-menu { position: relative; }
summary { display: flex; align-items: center; gap: 5px; cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary svg { width: 14px; height: 14px; }
.projects-popover { position: absolute; top: 34px; right: 0; width: 245px; border: 1px solid #2a3c4d; border-radius: 7px; background: #0c1b29; box-shadow: 0 15px 40px #0006; padding: 8px; }
.projects-popover a { display: flex; flex-direction: column; align-items: stretch; padding: 13px; border-radius: 4px; text-decoration: none; }
.projects-popover a:hover { background: #152c3c; }
.projects-popover strong { display: flex; align-items: center; justify-content: space-between; color: #edf6fa; }
.projects-popover strong svg { width: 14px; height: 14px; }
.projects-popover span { color: #94a9bb; font-size: 12px; margin-top: 6px; }
.menu-button { display: none; background: none; border: 1px solid #2a3c4d; border-radius: 5px; padding: 8px; color: #d6e5ee; }
.menu-button svg { display: block; width: 20px; height: 20px; }
@media (max-width: 760px) {
  .header-inner { min-height: 66px; }
  .wordmark { font-size: 23px; }
  .menu-button { display: block; }
  .site-navigation { display: none; position: absolute; left: 0; right: 0; top: 66px; align-items: stretch; gap: 0; padding: 12px 24px 20px; background: #091725; border-bottom: 1px solid #2a3c4d; box-shadow: 0 15px 25px #0003; }
  .site-navigation.open { display: flex; flex-direction: column; }
  .site-navigation > a, summary { padding: 14px 4px; }
  .site-navigation .github-link { align-self: flex-start; margin-top: 10px; padding: 9px 13px; }
  .projects-popover { position: static; width: 100%; margin-bottom: 8px; box-shadow: none; }
}
</style>
