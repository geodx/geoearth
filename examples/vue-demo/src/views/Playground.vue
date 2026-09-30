<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { ButtonInstance } from "element-plus";
import { useI18n } from "vue-i18n";
import { demoMap } from "@/demos/registry";
import CodeEditor from "@/components/playground/CodeEditor.vue";
import DemoDirectory from "@/components/directory/DemoDirectory.vue";
import PreviewFrame from "@/components/playground/PreviewFrame.vue";
import ResizablePanels from "@/components/ResizablePanels.vue";
import { RefreshLeft, VideoPlay, ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { useWorkbench } from "@/composables/useWorkbench";

const props = defineProps<{ id: string }>();

const { t } = useI18n();
const { layout } = useWorkbench();
const collapseButton = ref<ButtonInstance>();
const expandButton = ref<ButtonInstance>();

async function togglePanel() {
  layout.open = !layout.open;
  // 等按钮显示后转移焦点，避免焦点停留在已收起的面板里。
  await nextTick();
  const button = layout.open ? collapseButton.value : expandButton.value;
  button?.ref?.focus();
}

const appUrl = new URL(import.meta.env.BASE_URL, document.baseURI);
const currentDemo = computed(() => demoMap.get(props.id));

const demoUrl = computed(() => {
  const demo = currentDemo.value;
  return demo ? new URL(demo.path, appUrl).href : "";
});

const fileName = computed(
  () => currentDemo.value?.path.split("/").pop() ?? t("editor.title"),
);

const originalCode = ref("");
const draftCode = ref("");
const runningHtml = ref("");
const runId = ref(0);

const loading = ref(false);
const loadError = ref(false);

const canRun = computed(
  () => Boolean(currentDemo.value) && !loading.value && !loadError.value,
);

const hasPendingChanges = computed(
  () => draftCode.value !== runningHtml.value,
);

const statusText = computed(() => {
  if (!currentDemo.value) return t("editor.missing");
  if (loading.value) return t("editor.loading");
  if (loadError.value) return t("editor.loadFailed");

  return t(
    hasPendingChanges.value ? "editor.modified" : "editor.submitted",
  );
});

function run() {
  runningHtml.value = draftCode.value;
  runId.value += 1;
}

function reset() {
  draftCode.value = originalCode.value;
  run();
}

function showCode() {
  layout.panel = "code";
  layout.open = true;
}

// 只监听示例地址；切换面板、主题和语言都不会重新加载示例。
watch(
  demoUrl,
  async (url, _previousUrl, onCleanup) => {
    originalCode.value = "";
    draftCode.value = "";
    runningHtml.value = "";
    loadError.value = false;
    loading.value = Boolean(url);

    if (!url) return;

    const controller = new AbortController();

    // 快速切换案例时取消旧请求，防止旧源码覆盖新案例。
    onCleanup(() => controller.abort());

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load demo: HTTP ${response.status}`);
      }

      const html = await response.text();
      if (controller.signal.aborted) return;

      originalCode.value = html;
      draftCode.value = html;
      run();
    } catch (error) {
      if (controller.signal.aborted) return;

      loadError.value = true;
      console.error("Failed to load demo:", error);
    } finally {
      if (!controller.signal.aborted) {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <ResizablePanels class="playground" :label="t('panel.workspace')" :collapsed="!layout.open" :initial-size="42"
    :min-size="28" :max-size="65">
    <template #first>
      <div class="shared-panel">
        <!-- v-show 保留目录搜索状态和 Monaco 模型，不因切换面板而销毁。 -->
        <div v-show="layout.panel === 'directory'" id="directory-panel" class="panel-content" role="region"
          aria-labelledby="directory-tab">
          <DemoDirectory @select="showCode" />
        </div>
        <section v-show="layout.panel === 'code'" id="code-panel" class="code-pane" role="region"
          aria-labelledby="code-tab">
          <header class="pane-toolbar">
            <div class="pane-title">
              <span class="file-type">HTML</span>
              <span>{{ fileName }}</span>
              <span v-if="hasPendingChanges" class="pending-dot" :title="t('editor.pending')"></span>
            </div>
            <div class="editor-actions">
              <el-button text size="small" :disabled="!canRun" @click="reset">
                <el-icon aria-hidden="true"><RefreshLeft /></el-icon>
                <span>{{ t("editor.reset") }}</span>
              </el-button>

              <el-button type="primary" size="small" :disabled="!canRun" @click="run">
                <el-icon aria-hidden="true"><VideoPlay /></el-icon>
                <span>{{ t("editor.run") }}</span>
              </el-button>
            </div>
          </header>
          <div class="editor-container">
            <CodeEditor v-if="canRun" v-model="draftCode" />
          </div>
          <footer class="editor-footer">
            <span role="status">{{ statusText }}</span>
          </footer>
        </section>
        <el-button ref="collapseButton" v-show="layout.open" class="panel-handle" :aria-label="t('panel.collapse')" :title="t('panel.collapse')"
          :aria-expanded="true" :aria-controls="layout.panel + '-panel'" @click="togglePanel">
          <el-icon aria-hidden="true"><ArrowLeft /></el-icon>
        </el-button>
      </div>
    </template>
    <template #second>
      <div class="preview-container">
        <PreviewFrame v-if="canRun" :html="runningHtml" :run-id="runId" :base-url="demoUrl" />

        <el-empty v-else :description="statusText" :image-size="64" />
      </div>
    </template>
    <template #overlay>
      <el-button ref="expandButton" v-if="!layout.open" class="panel-handle panel-handle-expand" :aria-label="t('panel.expand')"
        :title="t('panel.expand')" :aria-expanded="false" :aria-controls="layout.panel + '-panel'"
        @click="togglePanel">
        <el-icon aria-hidden="true"><ArrowRight /></el-icon>
      </el-button>
    </template>
  </ResizablePanels>
</template>

<style scoped>
.shared-panel,
.panel-content {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.shared-panel {
  position: relative;
  overflow: visible;
}
.el-button.panel-handle {
  position: absolute;
  /* 18px 拉手放在面板外侧，并避开 4px 拖拽分隔线。 */
  right: -22px;
  top: 10px;
  width: 18px;
  height: 30px;
  padding: 0;
  z-index: 7;
  border-left: 0;
  border-radius: 0 5px 5px 0;
  color: var(--muted);
  background: var(--surface);
  transition:
    color 0.15s,
    background-color 0.15s;
}
.el-button.panel-handle:hover {
  color: var(--accent);
  background: var(--selected);
}
.el-button.panel-handle-expand {
  left: 0;
  right: auto;
}
.code-pane {
  height: 100%;
  display: grid;
  grid-template-rows: 50px minmax(0, 1fr) 26px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.pane-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  min-width: 0;
}
.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
  min-width: 0;
  white-space: nowrap;
}
.pane-title > span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-type {
  color: var(--accent);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  flex: none;
}
.editor-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}
.pending-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-warning);
  flex: none;
}
.editor-container {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.preview-container {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.editor-footer {
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--surface);
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

@media (max-width: 1000px) {
  .file-type { display: none; }
}
@media (max-width: 720px) {
  .pane-title { flex: 1; }
}
</style>
