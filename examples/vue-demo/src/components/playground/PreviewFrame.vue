<template>
  <iframe :key="runId" class="preview-frame" :title="t('editor.result')" @load.once="render"></iframe>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const props = defineProps<{
  html: string;
  runId: number;
  baseUrl: string;
}>();


function render(event: Event) {
  const iframe = event.currentTarget as HTMLIFrameElement;
  const doc = iframe.contentDocument;
  if (!doc) return;

  // 只处理运行副本，不修改编辑器中的源码。
  const source = new DOMParser().parseFromString(
    props.html,
    "text/html",
  );

  const base =
    source.querySelector<HTMLBaseElement>("base[href]") ??
    source.createElement("base");

  // 相对资源按原 HTML 地址解析；示例自己的 base 设置也予以保留。
  base.href = new URL(
    base.getAttribute("href") ?? "",
    props.baseUrl,
  ).href;

  source.head.prepend(base);

  // 由父页面写入空白 iframe，避开 Cesium 在 srcdoc 下的路径问题。
  doc.open();
  doc.write("<!doctype html>\n" + source.documentElement.outerHTML);
  doc.close();
}
</script>

<style scoped>
.preview-frame {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border: 0;
  background: var(--el-bg-color);
}
</style>
