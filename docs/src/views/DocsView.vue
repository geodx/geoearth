<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import MarkdownIt from 'markdown-it';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import SiteIcon from '../components/SiteIcon.vue';
import { documentGroups, documents } from '../content/docs';
import { exampleUrl, sourceUrl } from '../config';

const props = defineProps<{ slug: string }>();
const router = useRouter();
const current = computed(() => documents.find(item => item.slug === props.slug));
const currentIndex = computed(() => documents.findIndex(item => item.slug === props.slug));
const previous = computed(() => documents[currentIndex.value - 1]);
const following = computed(() => documents[currentIndex.value + 1]);
const html = ref('');
const loading = ref(true);
const error = ref('');
const headings = ref<Array<{ id: string; title: string; level: number }>>([]);
const copyTimers = new Set<ReturnType<typeof setTimeout>>();
let loadId = 0;
const markdown = new MarkdownIt({ html: false, linkify: true });
const baseLink = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]!;
  const href = token.attrGet('href') || '';
  const localDoc = href.match(/(?:^|\/)([\w-]+)\.md(?:#.*)?$/);
  if (localDoc) {
    const target = documents.find(item => item.slug === localDoc[1]);
    if (target) token.attrSet('href', router.resolve(`/docs/${target.slug}`).href);
    else if (localDoc[1] === 'README') token.attrSet('href', '/docs/getting-started');
    else token.attrSet('href', `${sourceUrl}/blob/main/${href.includes('THIRD_PARTY') ? 'packages/core/' : ''}${href.replace(/^\.\//, '')}`);
  } else if (href === './LICENSE') token.attrSet('href', sourceUrl + '/blob/main/LICENSE');
  if (/^https?:/.test(token.attrGet('href') || '')) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return baseLink ? baseLink(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
};
markdown.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index]!;
  const language = markdown.utils.escapeHtml(token.info.trim().split(/\s/)[0] || 'text');
  return `<div class="code-fence"><div class="fence-toolbar"><span>${language}</span><button type="button" data-copy-code aria-label="复制这段代码">复制</button></div><pre><code>${markdown.utils.escapeHtml(token.content)}</code></pre></div>`;
};
async function loadDocument() {
  const id = ++loadId;
  loading.value = true;
  error.value = '';
  html.value = '';
  headings.value = [];
  if (!current.value) { error.value = '该文档不存在，请从左侧选择其他主题。'; loading.value = false; return; }
  document.title = `${current.value.title} · GeoEarth 文档`;
  try {
    const source = await current.value.load();
    if (id !== loadId) return;
    const tokens = markdown.parse(source, {});
    const outline: typeof headings.value = [];
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]!;
      if (token.type !== 'heading_open') continue;
      const title = tokens[index + 1]?.content || '';
      const level = Number(token.tag.slice(1));
      const anchor = `doc-section-${index}`;
      token.attrSet('id', anchor);
      if (level === 2 || level === 3) outline.push({ id: anchor, title, level });
    }
    html.value = markdown.renderer.render(tokens, markdown.options, {});
    headings.value = outline;
    loading.value = false;
    await nextTick();
    if (router.currentRoute.value.hash) document.getElementById(router.currentRoute.value.hash.slice(1))?.scrollIntoView();
  } catch { if (id === loadId) error.value = '文档加载失败，请重试。'; }
  finally { if (id === loadId) loading.value = false; }
}
watch(() => props.slug, loadDocument, { immediate: true });
async function copyFence(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-code]');
  if (!button) return;
  const code = button.closest('.code-fence')?.querySelector('code')?.textContent || '';
  try { await navigator.clipboard.writeText(code); button.textContent = '已复制'; }
  catch { button.textContent = '请手动复制'; }
  const timer = setTimeout(() => { if (button.isConnected) button.textContent = '复制'; copyTimers.delete(timer); }, 2000);
  copyTimers.add(timer);
}
onUnmounted(() => { loadId++; copyTimers.forEach(clearTimeout); });
</script>

<template>
  <div class="docs-page">
    <SiteHeader />
    <div class="mobile-doc-navigation wrap"><label for="doc-select">开发文档</label><select id="doc-select" :value="slug" @change="router.push('/docs/' + ($event.target as HTMLSelectElement).value)"><option v-for="item in documents" :key="item.slug" :value="item.slug">{{ item.title }}</option></select></div>
    <div class="docs-layout wrap">
      <aside class="docs-sidebar" aria-label="文档目录">
        <p class="eyebrow">DEVELOPER DOCS</p>
        <nav v-for="group in documentGroups" :key="group" :aria-label="group"><h2>{{ group }}</h2><RouterLink v-for="item in documents.filter(item => item.group === group)" :key="item.slug" :to="'/docs/' + item.slug" :class="{ selected: slug === item.slug }" :aria-current="slug === item.slug ? 'page' : undefined">{{ item.title }}</RouterLink></nav>
      </aside>
      <main id="main-content" class="docs-main">
        <p class="doc-breadcrumb">开发文档 <span>/</span> {{ current?.title || '未找到文档' }}</p>
        <div class="doc-heading"><h1>{{ current?.title || '未找到文档' }}</h1><a v-if="current" class="text-link" :href="exampleUrl(current.example)" target="_blank" rel="noopener noreferrer">运行示例<SiteIcon name="external" /></a></div>
        <p v-if="loading" class="doc-message" role="status">正在加载文档…</p>
        <div v-else-if="error" class="doc-message" role="alert">{{ error }}<button v-if="current" class="button" type="button" @click="loadDocument">重新加载</button></div>
        <article v-else class="markdown-body" @click="copyFence" v-html="html"></article>
        <div v-if="!loading && !error" class="doc-bottom"><a :href="sourceUrl + '/blob/main/' + (slug === 'getting-started' ? 'packages/core/README.md' : 'docs/' + slug + '.md')" target="_blank" rel="noopener noreferrer">查看文档源码<SiteIcon name="external" /></a><span>与 SDK 源码同步维护</span></div>
        <nav v-if="!loading && !error" class="doc-pagination" aria-label="相邻文档"><RouterLink v-if="previous" :to="'/docs/' + previous.slug"><small>上一页</small><span>← {{ previous.title }}</span></RouterLink><RouterLink v-if="following" class="next-doc" :to="'/docs/' + following.slug"><small>下一页</small><span>{{ following.title }} →</span></RouterLink></nav>
      </main>
      <aside v-if="headings.length" class="docs-outline" aria-label="当前页面目录"><h2>本页内容</h2><a v-for="heading in headings" :key="heading.id" :href="'#' + heading.id" :class="{ nested: heading.level === 3 }">{{ heading.title }}</a></aside>
    </div>
    <SiteFooter />
  </div>
</template>

<style scoped>
.docs-page { background: #08131e; min-height: 100vh; }
.docs-layout { display: grid; grid-template-columns: 190px minmax(0, 1fr) 170px; gap: 48px; padding-block: 48px 70px; align-items: start; min-height: calc(100vh - 240px); }
.docs-sidebar, .docs-outline { position: sticky; top: 112px; max-height: calc(100vh - 145px); overflow-y: auto; scrollbar-width: thin; }
.docs-sidebar .eyebrow { font-size: 10px; color: #618698; margin: 0 0 28px; }
.docs-sidebar nav + nav { margin-top: 25px; }
.docs-sidebar h2 { font-size: 11px; color: #b9cbd7; margin: 0 0 9px; font-weight: 600; }
.docs-sidebar a { display: block; font-size: 12px; color: #88a1b3; text-decoration: none; padding: 9px 13px; border-left: 1px solid #273d4c; }
.docs-sidebar a:hover { color: #e0f2f9; }
.docs-sidebar a.selected { color: #70e3ee; background: #12303c; border-left-color: #70e3ee; border-radius: 0 4px 4px 0; }
.docs-main { min-width: 0; }
.doc-breadcrumb { font-size: 11px; color: #88a1b3; margin: 0 0 19px; }
.doc-breadcrumb span { color: #466274; margin: 0 9px; }
.doc-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 35px; }
.doc-heading h1 { font-size: 35px; margin: 0; letter-spacing: -.04em; }
.doc-heading .text-link { font-size: 11px; white-space: nowrap; }
.doc-message { font-size: 14px; line-height: 1.8; color: #9db6c7; min-height: 240px; }
.doc-message button { display: block; margin-top: 25px; font-size: 12px; }
.docs-outline h2 { font-size: 10px; color: #b1c7d5; margin: 2px 0 15px; }
.docs-outline a { display: block; font-size: 11px; line-height: 1.6; margin: 9px 0; text-decoration: none; color: #6f8fa4; }
.docs-outline a:hover { color: #6ce1ed; }
.docs-outline a.nested { padding-left: 11px; font-size: 10px; }
.markdown-body { color: #b4c7d3; font-size: 14px; line-height: 1.9; overflow-wrap: anywhere; }
.markdown-body :deep(> h1:first-child) { display: none; }
.markdown-body :deep(h2), .markdown-body :deep(h3), .markdown-body :deep(h4) { color: #e6f1f8; scroll-margin-top: 110px; line-height: 1.5; letter-spacing: -.02em; }
.markdown-body :deep(h2) { font-size: 23px; font-weight: 600; padding-bottom: 11px; border-bottom: 1px solid #bad8e518; margin-top: 44px; }
.markdown-body :deep(h3) { font-size: 17px; font-weight: 600; margin-top: 30px; }
.markdown-body :deep(h4) { font-size: 15px; }
.markdown-body :deep(p) { margin: 16px 0; }
.markdown-body :deep(a) { color: #6edce9; text-underline-offset: 3px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 23px; }
.markdown-body :deep(li) { margin: 5px 0; }
.markdown-body :deep(strong) { color: #e5f0f7; font-weight: 600; }
.markdown-body :deep(blockquote) { border-left: 3px solid #3c889e; margin: 20px 0; padding: 2px 19px; color: #9bb5c5; background: #0f2633; border-radius: 0 4px 4px 0; }
.markdown-body :deep(:not(pre) > code) { padding: 3px 5px; border-radius: 4px; background: #172c3b; color: #abd6e9; font: 12px/1.8 ui-monospace, SFMono-Regular, Consolas, monospace; }
.markdown-body :deep(.code-fence) { border: 1px solid #2c4253; border-radius: 6px; margin: 22px 0; overflow: hidden; background: #06101a; }
.markdown-body :deep(.fence-toolbar) { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; color: #7f9aac; background: #101f2c; font: 10px/1.5 ui-monospace, monospace; }
.markdown-body :deep(.fence-toolbar button) { color: #9cb6c6; background: none; border: 0; font-size: 10px; padding: 3px 6px; }
.markdown-body :deep(.fence-toolbar button:hover) { color: #6ce1ed; }
.markdown-body :deep(pre) { margin: 0; padding: 19px; overflow-x: auto; color: #c6dfea; white-space: pre; font: 12px/1.8 ui-monospace, SFMono-Regular, Consolas, monospace; }
.markdown-body :deep(table) { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; font-size: 12px; line-height: 1.7; margin-block: 23px; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid #2b4251; padding: 10px 12px; text-align: left; min-width: 95px; }
.markdown-body :deep(th) { color: #d9edf6; background: #112734; font-weight: 600; }
.markdown-body :deep(hr) { border: 0; border-top: 1px solid #29404f; margin: 30px 0; }
.markdown-body :deep(img) { max-width: 100%; }
.doc-bottom { display: flex; justify-content: space-between; gap: 20px; padding-top: 23px; margin-top: 45px; border-top: 1px solid #243b49; color: #58798d; font-size: 10px; }
.doc-bottom a { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: #90adbd; }
.doc-bottom svg { width: 12px; height: 12px; }
.doc-pagination { display: flex; gap: 14px; margin-top: 30px; }
.doc-pagination a { display: flex; flex: 1; flex-direction: column; gap: 9px; border: 1px solid #2c4253; border-radius: 5px; text-decoration: none; padding: 15px; }
.doc-pagination a:hover { border-color: #5cb1c3; }
.doc-pagination small { color: #648497; font-size: 10px; }
.doc-pagination span { color: #c0dce9; font-size: 12px; }
.doc-pagination a.next-doc { align-items: flex-end; margin-left: auto; }
.mobile-doc-navigation { display: none; }
@media(max-width: 1100px) { .docs-layout { grid-template-columns: 180px minmax(0, 1fr); gap: 32px; } .docs-outline { display: none; } }
@media(max-width: 760px) { .docs-layout { grid-template-columns: minmax(0, 1fr); gap: 0; padding-top: 26px; } .docs-sidebar { display: none; } .mobile-doc-navigation { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding-block: 18px; border-bottom: 1px solid #2b3c49; font-size: 12px; color: #8ea7b8; } .mobile-doc-navigation select { background: #112533; border: 1px solid #2c4657; border-radius: 4px; padding: 7px 10px; color: #d8e7ef; width: 175px; } .doc-heading h1 { font-size: 29px; } .doc-heading { margin-bottom: 25px; } .markdown-body { font-size: 13px; } .markdown-body :deep(h2) { font-size: 21px; } .markdown-body :deep(pre) { font-size: 11px; padding: 15px; } .doc-bottom { flex-wrap: wrap; } }
</style>
