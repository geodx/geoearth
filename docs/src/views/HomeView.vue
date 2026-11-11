<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import SiteIcon from '../components/SiteIcon.vue';
import { exampleUrl, adminUrl } from '../config';

const examples = [
  { id: 'effect-water', image: 'water', title: '真实感水体', caption: '波浪、倒影与水下光影', category: 'EFFECTS' },
  { id: 'analysis-profile', image: 'profile', title: '地形剖面', caption: '从地形到高程曲线', category: 'ANALYSIS' },
  { id: 'analysis-height-limit', image: 'height-limit', title: '建筑限高', caption: '让空间约束直观可见', category: 'ANALYSIS' },
];
const capabilities = [
  { icon: 'layers' as const, title: '资源管理', text: '影像、地形、模型与三维瓦片，用统一的方式接入场景。', target: 'data-tileset' },
  { icon: 'pen' as const, title: '交互绘制', text: '绘制、量测、拾取与高亮，让地图响应每一次交互。', target: 'draw-polyline' },
  { icon: 'terrain' as const, title: '空间分析', text: '剖面、通视与限高分析，把空间关系转化为可读的结果。', target: 'analysis-line-of-sight' },
  { icon: 'chart' as const, title: '可视化效果', text: '水体、天气、标记与图表，为地理数据增加表达。', target: 'effect-weather' },
];
const language = ref<'TypeScript' | 'HTML'>('TypeScript');
const copyState = ref<'idle' | 'copied' | 'failed'>('idle');
let copyTimer: ReturnType<typeof setTimeout> | undefined;
const snippets = {
  TypeScript: "import { GeoEarth } from 'geoearth';\nimport 'geoearth/style.css';\n\nconst earth = new GeoEarth('earth');\nawait earth.onReady();",
  HTML: '<div id="earth" style="height: 100vh"></div>\n<script src="/sdk/cesium/Cesium.js"><\/script>\n<script src="/sdk/geoearth.js"><\/script>\n<script>\n  const earth = new GeoEarth("earth");\n<\/script>',
};
const snippet = computed(() => snippets[language.value]);
const highlighted = computed(() => {
  const escaped = snippet.value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return escaped.replace(/('[^']*'|"[^"]*")|\b(import|from|const|new|await)\b/g, (match, quoted) => `<span class="${quoted ? 'code-string' : 'code-keyword'}">${match}</span>`);
});
async function copyCode() {
  clearTimeout(copyTimer);
  try { await navigator.clipboard.writeText(snippet.value); copyState.value = 'copied'; }
  catch { copyState.value = 'failed'; }
  copyTimer = setTimeout(() => { copyState.value = 'idle'; }, 2500);
}
onUnmounted(() => clearTimeout(copyTimer));
</script>

<template>
  <div class="home-page">
    <SiteHeader />
    <main id="main-content">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-light" aria-hidden="true"></div>
        <div class="stars" aria-hidden="true"><i v-for="n in 27" :key="n" :style="{ left: (n * 37 % 100) + '%', top: (n * 23 % 90) + '%', animationDelay: -(n % 5) + 's' }"></i></div>
        <svg class="atlas-grid" viewBox="0 0 1400 470" fill="none" aria-hidden="true">
          <g stroke="#2691b4" stroke-width=".7">
            <path v-for="n in 7" :key="'h' + n" :d="`M-100 ${440 + n * 18} Q800 ${145 - n * 17} 1500 ${170 + n * 27}`" />
            <path v-for="n in 12" :key="'v' + n" :d="`M${n * 155 - 440} 490 Q${700 + n * 17} 210 ${1000 + n * 42} 200`" />
          </g>
          <path d="M0 300Q700 400 1400 30M450 0Q1000 0 1400 310" stroke="#2588c5" stroke-width=".8" opacity=".5" />
        </svg>
        <div class="hero-inner wrap">
          <div class="hero-copy">
            <p class="eyebrow">CESIUM <span>·</span> TYPESCRIPT</p>
            <h1 id="hero-title">让三维地理开发<br /><em>更简单</em></h1>
            <p class="hero-description">基于 Cesium 的 TypeScript 三维地球 SDK</p>
            <p class="hero-detail">资源管理 · 交互工具 · 空间分析 · 可视化</p>
            <div class="hero-actions">
              <a class="button primary" :href="exampleUrl()" target="_blank" rel="noopener noreferrer">查看示例<SiteIcon name="arrow" /></a>
              <RouterLink class="button" to="/docs/getting-started">快速开始</RouterLink>
            </div>
            <p class="hero-footnote"><span></span>面向开发者，自由构建每一个场景</p>
          </div>
          <div class="globe-scene">
            <div class="globe-halo" aria-hidden="true"></div>
            <picture>
              <source media="(prefers-reduced-motion: reduce)" srcset="/media/globe-still.png" />
              <img class="globe" src="/media/tech-globe.webp" alt="由青蓝色地理线条构成的旋转科技地球" width="420" height="392" fetchpriority="high" />
            </picture>
            <div class="globe-ground" aria-hidden="true"></div>
            <p class="globe-caption"><span></span>让世界，触手可及</p>
          </div>
        </div>
      </section>

      <section id="showcase" class="showcase wrap" aria-labelledby="showcase-title">
        <div class="section-heading"><div><p class="eyebrow">BUILT WITH GEOEARTH</p><h2 id="showcase-title">从真实效果开始</h2></div><a class="text-link" :href="exampleUrl()" target="_blank" rel="noopener noreferrer">全部示例<SiteIcon name="arrow" /></a></div>
        <div class="showcase-grid">
          <a v-for="item in examples" :key="item.id" class="example-card" :href="exampleUrl(item.id)" target="_blank" rel="noopener noreferrer">
            <div class="example-image"><img :src="`/media/${item.image}.webp`" :alt="`GeoEarth ${item.title}示例实际画面`" width="960" height="600" loading="lazy" /><span>{{ item.category }}</span></div>
            <div class="example-caption"><div><h3>{{ item.title }}</h3><p>{{ item.caption }}</p></div><SiteIcon name="arrow" /></div>
          </a>
        </div>
      </section>

      <section id="capabilities" class="capabilities" aria-labelledby="capabilities-title">
        <div class="wrap">
          <div class="section-heading"><div><p class="eyebrow">ONE SDK, MORE POSSIBILITIES</p><h2 id="capabilities-title">为三维应用准备好常用能力</h2></div></div>
          <div class="capability-grid">
            <a v-for="item in capabilities" :key="item.title" :href="exampleUrl(item.target)" target="_blank" rel="noopener noreferrer"><SiteIcon :name="item.icon" /><h3>{{ item.title }}<span>↗</span></h3><p>{{ item.text }}</p></a>
          </div>
        </div>
      </section>

      <section id="quick-start" class="quick-start wrap" aria-labelledby="quick-title">
        <div class="quick-copy"><p class="eyebrow">LESS SETUP. MORE CREATING.</p><h2 id="quick-title">几行代码，<br />开启三维世界</h2><p>从一个地球开始，逐步加入你的数据与交互。</p><RouterLink class="button" to="/docs/getting-started">阅读开发文档<SiteIcon name="arrow" /></RouterLink></div>
        <div class="code-panel">
          <div class="code-toolbar"><div role="tablist" aria-label="接入方式"><button v-for="tab in (['TypeScript', 'HTML'] as const)" :id="'code-tab-' + tab" :key="tab" role="tab" type="button" :aria-selected="language === tab" aria-controls="code-content" :class="{ active: language === tab }" @click="language = tab; copyState = 'idle'">{{ tab }}</button></div><button class="copy-button" type="button" :aria-label="copyState === 'copied' ? '已复制代码' : '复制代码'" @click="copyCode"><SiteIcon :name="copyState === 'copied' ? 'check' : 'copy'" /><span>{{ copyState === 'copied' ? '已复制' : '复制' }}</span></button></div>
          <pre id="code-content" role="tabpanel" :aria-labelledby="'code-tab-' + language"><code v-html="highlighted"></code></pre>
          <div class="code-bottom"><code>npm install geoearth cesium</code><span role="status">{{ copyState === 'failed' ? '复制失败，请选中代码复制' : 'ESM + 浏览器脚本' }}</span></div>
        </div>
      </section>

      <section id="projects" class="related wrap" aria-labelledby="admin-title">
        <div class="related-copy"><p class="eyebrow">MORE FROM US</p><h2 id="admin-title">Admin Platform</h2><p>基于 Spring Boot 与 Vue 的后台开发平台，<br />为业务系统准备好常用基础能力。</p><a class="text-link" :href="adminUrl" target="_blank" rel="noopener noreferrer">了解项目<SiteIcon name="external" /></a></div>
        <a class="admin-preview" :href="adminUrl" target="_blank" rel="noopener noreferrer" aria-label="了解 Admin Platform"><div class="preview-chrome"><span></span><span></span><span></span><small>admin.geoearth.dev</small></div><img src="/media/admin-platform.webp" alt="Admin Platform 分析页面实际界面" width="1000" height="526" loading="lazy" /></a>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.home-page { overflow: clip; background: radial-gradient(ellipse at 85% 40%, #0c1d2a70, transparent 50%), #07111b; }
.hero { position: relative; isolation: isolate; min-height: 640px; }
.hero-light { position: absolute; inset: -100px 0 -70px; z-index: -2; background: radial-gradient(ellipse at 75% 45%, #07426755 0%, #092a4540 24%, transparent 65%), linear-gradient(135deg, #06101b, #06182780 65%, #07121d); }
.hero-light::after { content: ''; position: absolute; inset: 75% 0 0; background: linear-gradient(transparent, #07111b); }
.hero-inner { position: relative; min-height: 640px; display: grid; grid-template-columns: 1.08fr 1fr; align-items: center; gap: 10px; }
.hero-copy { padding-bottom: 20px; z-index: 2; }
.hero-copy .eyebrow { font-size: 12px; letter-spacing: .26em; margin-bottom: 27px; color: #b2d6e6; }
.hero-copy .eyebrow span { margin: 0 8px; color: #428ba9; }
h1 { font-size: clamp(44px, 4.8vw, 68px); font-weight: 760; line-height: 1.25; letter-spacing: -.045em; margin: 0 0 25px; white-space: nowrap; }
h1 em { color: #57e1ed; font-style: normal; }
.hero-description { font-size: clamp(14px, 1.3vw, 17px); color: #d2e1ea; margin: 0 0 11px; }
.hero-detail { font-size: 14px; color: #8fa9bb; letter-spacing: .035em; margin: 0; }
.hero-actions { display: flex; gap: 16px; margin-top: 34px; }
.hero-footnote { display: flex; gap: 8px; align-items: center; margin: 26px 0 0; color: #618595; font-size: 11px; letter-spacing: .03em; }
.hero-footnote > span { width: 4px; height: 4px; border-radius: 50%; background: #54c6cb; box-shadow: 0 0 8px #55d5dc66; }
.globe-scene { position: relative; align-self: stretch; display: grid; align-items: center; justify-items: center; min-width: 0; }
.globe { position: relative; display: block; width: min(550px, 45vw); height: auto; mix-blend-mode: screen; filter: drop-shadow(0 0 22px #11a2c11a); }
.globe-scene picture { position: relative; z-index: 1; }
.globe-halo { position: absolute; width: 110%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, #0879a01b, #10375112 45%, transparent 68%); }
.globe-ground { position: absolute; bottom: 90px; width: 72%; height: 55px; border-radius: 50%; background: radial-gradient(ellipse, #17d7ed32, #0b5a7320 40%, transparent 70%); filter: blur(13px); }
.globe-caption { position: absolute; bottom: 60px; right: 15px; display: flex; align-items: center; gap: 12px; color: #abc7d4; font-size: 11px; letter-spacing: .12em; }
.globe-caption span { display: block; width: 2px; height: 12px; background: #4ed4df; }
.atlas-grid { position: absolute; bottom: -15px; left: 0; width: 100%; height: 400px; opacity: .25; z-index: -1; mask-image: linear-gradient(90deg, transparent, #000 25%), linear-gradient(transparent, #000 35%, transparent); mask-composite: intersect; }
.stars { position: absolute; inset: 0 0 10% 32%; z-index: -1; overflow: hidden; }
.stars i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #65cff8; opacity: .26; animation: twinkle 5s ease-in-out infinite; }
.stars i:nth-child(3n) { width: 1px; height: 1px; }
@keyframes twinkle { 50% { opacity: .65; transform: translateY(-4px); } }
.showcase { position: relative; padding-top: 20px; padding-bottom: 80px; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 22px; margin-bottom: 28px; }
.section-heading .eyebrow { font-size: 10px; margin: 0 0 12px; color: #608598; }
h2 { font-size: clamp(26px, 2.6vw, 34px); font-weight: 650; line-height: 1.35; letter-spacing: -.035em; margin: 0; }
.section-heading > .text-link { margin-bottom: 5px; }
.showcase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 23px; }
.example-card { min-width: 0; color: #eaf4f9; text-decoration: none; border: 1px solid #294050; border-radius: 5px; overflow: hidden; background: #0b1b27; transition: border-color .25s, transform .25s; }
.example-card:hover { border-color: #60c6d1; transform: translateY(-4px); }
.example-image { position: relative; overflow: hidden; aspect-ratio: 1.6; background: #102735; }
.example-image img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .5s; }
.example-card:hover img { transform: scale(1.035); }
.example-image > span { position: absolute; top: 13px; left: 14px; font: 9px/1 ui-monospace, monospace; letter-spacing: .08em; padding: 6px 8px; border: 1px solid #e4f3ff3b; background: #06101b80; color: #ebf7fa; border-radius: 3px; backdrop-filter: blur(8px); }
.example-caption { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 19px 20px; }
.example-caption h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
.example-caption p { font-size: 11px; color: #7995a6; margin: 0; }
.example-caption > svg { width: 19px; height: 19px; color: #8db4c3; transition: transform .2s; }
.example-card:hover .example-caption > svg { transform: translateX(4px); color: #6de6f1; }
.capabilities { padding: 65px 0 68px; border-block: 1px solid #b0d8e510; background: #0a1722b3; }
.capability-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 38px; }
.capability-grid a { padding: 0 28px; border-left: 1px solid #9dd2e21c; text-decoration: none; }
.capability-grid a:first-child { padding-left: 0; border: 0; }
.capability-grid a:last-child { padding-right: 0; }
.capability-grid a > svg { width: 29px; height: 29px; color: #60dbe7; }
.capability-grid h3 { display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin: 19px 0 9px; }
.capability-grid h3 span { color: #5b9aa9; opacity: 0; transition: opacity .2s; }
.capability-grid a:hover h3 { color: #82e7ef; }
.capability-grid a:hover h3 span { opacity: 1; }
.capability-grid p { font-size: 12px; color: #8da3b3; line-height: 1.9; margin: 0; max-width: 245px; }
.quick-start { display: grid; grid-template-columns: 1fr 1.36fr; gap: 70px; padding-block: 85px; align-items: center; }
.quick-copy .eyebrow { color: #608598; font-size: 10px; margin: 0 0 15px; }
.quick-copy h2 { font-size: 34px; line-height: 1.5; }
.quick-copy > p:not(.eyebrow) { font-size: 12px; line-height: 1.8; color: #8da3b3; margin: 15px 0 26px; }
.quick-copy .button { min-height: 43px; font-size: 12px; }
.code-panel { min-width: 0; border: 1px solid #2a3f4e; border-radius: 7px; background: linear-gradient(140deg, #0d1d2b, #08131d); overflow: hidden; box-shadow: 0 20px 70px #0002; }
.code-toolbar { display: flex; justify-content: space-between; align-items: center; min-height: 48px; padding: 0 14px; border-bottom: 1px solid #9fcee217; background: #ccddeb04; }
.code-toolbar [role=tablist] { display: flex; align-self: stretch; gap: 18px; }
.code-toolbar [role=tab] { border: 0; border-bottom: 2px solid transparent; padding: 0 3px; color: #718a9b; background: none; font-size: 11px; }
.code-toolbar [role=tab].active { color: #c8e8f3; border-bottom-color: #5adae6; }
.copy-button { display: inline-flex; align-items: center; gap: 6px; border: 0; padding: 7px; background: none; color: #94adbd; font-size: 10px; }
.copy-button:hover { color: #63e1ee; }
.copy-button svg { width: 14px; height: 14px; }
pre { min-height: 190px; margin: 0; padding: 27px 23px; overflow-x: auto; color: #d5e7f0; font: 13px/1.9 ui-monospace, SFMono-Regular, Consolas, monospace; }
pre :deep(.code-keyword) { color: #bcaff8; }
pre :deep(.code-string) { color: #e3bb89; }
.code-bottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 18px; border-top: 1px solid #9fcee20f; color: #648292; font-size: 9px; }
.code-bottom code { font-size: 10px; color: #8bacbc; }
.related { display: grid; grid-template-columns: .95fr 1.05fr; align-items: center; gap: 35px; padding: 37px 42px 0; margin-bottom: 60px; border: 1px solid #304452; border-radius: 8px; background: linear-gradient(120deg, #11222e, #0c1924); overflow: hidden; }
.related-copy { padding-bottom: 37px; }
.related-copy .eyebrow { color: #68d7e3; font-size: 10px; margin: 0 0 15px; }
.related h2 { font-size: 30px; letter-spacing: -.04em; }
.related-copy > p:not(.eyebrow) { color: #96afbe; font-size: 12px; line-height: 1.9; margin: 13px 0 23px; }
.admin-preview { display: block; min-width: 0; border: 1px solid #436071; border-bottom: 0; border-radius: 6px 6px 0 0; background: #152937; overflow: hidden; align-self: end; box-shadow: 0 10px 40px #0004; transform: translateY(1px); transition: transform .3s; }
.admin-preview:hover { transform: translateY(-4px); }
.preview-chrome { display: flex; align-items: center; gap: 4px; padding: 9px 10px; color: #7895a8; }
.preview-chrome > span { width: 4px; height: 4px; border-radius: 50%; background: #587b8c; }
.preview-chrome small { margin-left: 9px; font: 9px ui-monospace, monospace; }
.admin-preview img { width: 100%; height: auto; display: block; filter: brightness(.84) saturate(.75); }
@media (min-width: 1600px) { .hero, .hero-inner { min-height: 695px; } .globe { width: 590px; } }
@media (max-width: 1000px) {
  .hero, .hero-inner { min-height: 570px; }
  .hero-detail { font-size: 12px; }
  .globe-ground { bottom: 90px; }
  .showcase-grid { gap: 15px; }
  .capability-grid a { padding-inline: 20px; }
  .quick-start { gap: 30px; }
  .related { padding: 30px 28px 0; }
}
@media (max-width: 760px) {
  .hero-inner { display: flex; flex-direction: column; align-items: stretch; gap: 0; padding-top: 44px; }
  .hero-copy { padding-bottom: 0; }
  .hero-copy .eyebrow { margin: 0 0 21px; font-size: 10px; }
  h1 { font-size: clamp(36px, 9.8vw, 56px); letter-spacing: -.04em; margin-bottom: 23px; }
  .hero-description { font-size: 13px; }
  .hero-detail { font-size: 11px; }
  .hero-actions { margin-top: 27px; gap: 12px; }
  .hero-actions .button { flex: 1; max-width: 185px; gap: 20px; padding-inline: 14px; min-height: 44px; font-size: 13px; }
  .hero-footnote { margin-top: 18px; font-size: 9px; }
  .globe-scene { min-height: 340px; margin-top: -8px; }
  .globe { width: min(375px, 96vw); }
  .globe-ground { bottom: 28px; width: 60%; }
  .globe-caption { bottom: 10px; right: 2px; font-size: 9px; }
  .hero-light { background: radial-gradient(ellipse at 70% 63%, #07426755, transparent 60%), #061320; }
  .atlas-grid { bottom: 0; width: 180%; left: -50%; opacity: .22; }
  .stars { inset: 30% 0 10%; }
  .showcase { padding-top: 48px; padding-bottom: 45px; }
  .section-heading { margin-bottom: 23px; align-items: center; }
  .section-heading .eyebrow { font-size: 8px; letter-spacing: .12em; margin-bottom: 9px; }
  h2 { font-size: 25px; }
  .section-heading > .text-link { font-size: 10px; gap: 5px; white-space: nowrap; }
  .showcase-grid { grid-template-columns: 1fr; gap: 20px; }
  .example-image { aspect-ratio: 1.75; }
  .example-caption { padding: 17px 18px; }
  .capabilities { padding-block: 44px; }
  .capability-grid { grid-template-columns: 1fr 1fr; gap: 32px 0; margin-top: 29px; }
  .capability-grid a { padding-inline: 0 20px; border: 0; }
  .capability-grid a:nth-child(even) { padding: 0 0 0 20px; border-left: 1px solid #9dd2e21c; }
  .capability-grid h3 { font-size: 16px; margin-top: 13px; }
  .capability-grid p { font-size: 11px; }
  .capability-grid h3 span { opacity: 1; }
  .quick-start { grid-template-columns: 1fr; padding-block: 50px; gap: 27px; }
  .quick-copy h2 { font-size: 29px; line-height: 1.35; }
  .quick-copy h2 br { display: none; }
  pre { font-size: 10px; padding: 21px 15px; min-height: 172px; }
  .code-bottom { padding-inline: 12px; }
  .code-bottom code { font-size: 9px; }
  .code-bottom > span { font-size: 8px; }
  .related { grid-template-columns: 1fr; padding: 27px 23px 0; gap: 0; margin-bottom: 40px; }
  .related h2 { font-size: 28px; }
  .related-copy { padding-bottom: 28px; }
}
</style>
