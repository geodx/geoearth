<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { exampleUrl, sourceUrl, adminUrl } from '../config';
import SiteIcon from './SiteIcon.vue';
import { language, text, setLanguage, type SiteLanguage } from '../locales';

const route = useRoute();
const router = useRouter();
function selectLanguage(event: Event) {
  const value = (event.target as HTMLSelectElement).value as SiteLanguage;
  setLanguage(value);
  if (route.query.lang) void router.replace({ path: route.path, query: { ...route.query, lang: value }, hash: route.hash });
}
const open = ref(false);
const projects = ref<HTMLDetailsElement>();
watch(() => route.fullPath, () => { open.value = false; if (projects.value) projects.value.open = false; });
</script>

<template>
  <a class="skip-link" href="#main-content">{{ text.skip }}</a>
  <header class="site-header" @keydown.esc="open = false">
    <div class="header-inner wrap">
      <RouterLink to="/" class="wordmark" :aria-label="text.homeLabel">
        <img src="/favicon.svg" width="31" height="31" alt="" /><span>GeoEarth</span>
      </RouterLink>
      <select class="language-select" :aria-label="text.language" :value="language" @change="selectLanguage"><option value="en" lang="en">English</option><option value="zh-CN" lang="zh-CN">简体中文</option></select>
      <button class="menu-button" type="button" :aria-expanded="open" aria-controls="site-navigation" :aria-label="open ? text.closeMenu : text.openMenu" @click="open = !open">
        <SiteIcon :name="open ? 'close' : 'menu'" />
      </button>
      <nav id="site-navigation" class="site-navigation" :class="{ open }" :aria-label="text.navigation">
        <RouterLink :to="{ path: '/', hash: '#capabilities' }">{{ text.features }}</RouterLink>
        <a :href="exampleUrl()" target="_blank" rel="noopener noreferrer">{{ text.examples }}<SiteIcon name="external" /></a>
        <RouterLink to="/docs/getting-started" :class="{ active: route.name === 'docs' }">{{ text.docs }}</RouterLink>
        <details ref="projects" class="projects-menu">
          <summary>{{ text.moreProjects }}<SiteIcon name="chevron" /></summary>
          <div class="projects-popover">
            <a :href="adminUrl" target="_blank" rel="noopener noreferrer"><strong>Admin Platform<SiteIcon name="external" /></strong><span>{{ text.adminTagline }}</span></a>
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
.language-select { margin-left: auto; background: #0c1b29; color: #c7dbe8; border: 1px solid #2a3c4d; border-radius: 5px; padding: 8px; font: inherit; font-size: 12px; max-width: 112px; }
.site-navigation { display: flex; align-items: center; gap: 24px; font-size: 13px; }
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
@media (max-width: 1000px) {
  .header-inner { min-height: 66px; gap: 14px; }
  .wordmark { font-size: 23px; }
  .menu-button { display: block; }
  .language-select { margin-left: auto; background: #0c1b29; color: #c7dbe8; border: 1px solid #2a3c4d; border-radius: 5px; padding: 8px; font: inherit; font-size: 12px; max-width: 112px; }
.site-navigation { display: none; position: absolute; left: 0; right: 0; top: 66px; align-items: stretch; gap: 0; padding: 12px 24px 20px; background: #091725; border-bottom: 1px solid #2a3c4d; box-shadow: 0 15px 25px #0003; }
  .site-navigation.open { display: flex; flex-direction: column; }
  .site-navigation > a, summary { padding: 14px 4px; }
  .site-navigation .github-link { align-self: flex-start; margin-top: 10px; padding: 9px 13px; }
  .projects-popover { position: static; width: 100%; margin-bottom: 8px; box-shadow: none; }
}
</style>
