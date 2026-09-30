<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { demoMap } from "@/demos/registry";
import { Compass, Connection, Monitor, Moon, Sunny, Grid, EditPen } from "@element-plus/icons-vue";
import { useWorkbench } from "@/composables/useWorkbench";
import EditorSettings from "@/components/playground/EditorSettings.vue";

const { settings, layout, colorMode } = useWorkbench();
const { t } = useI18n();
const route = useRoute();
const currentDemo = computed(() =>
  demoMap.get(String(route.params.id ?? "")),
);
const helpOpen = ref(false);
const panels = [
  { id: "directory", label: "directory.title", icon: Grid },
  { id: "code", label: "editor.title", icon: EditPen },
] as const;
const themeModes = ["light", "dark", "auto"] as const;

function togglePanel(panel: "directory" | "code") {
  if (layout.panel === panel) layout.open = !layout.open;
  else {
    layout.panel = panel;
    layout.open = true;
  }
}
</script>

<template>
  <div class="workbench">
    <header class="topbar">
      <RouterLink class="brand" to="/" aria-label="GeoEarth">
        <span class="brand-mark">
          <el-icon aria-hidden="true"><Compass /></el-icon>
        </span><strong>GeoEarth<span> / LAB</span></strong>
      </RouterLink>
      <div class="current-example">
        <span class="live-dot"></span>
        <h1>{{ t(currentDemo?.title ?? "demos.fallback") }}</h1>
      </div>
      <nav class="top-actions" :aria-label="t('nav.label')">
        <el-button text class="nav-link" @click="helpOpen = true">{{
          t("nav.guide")
        }}</el-button>
        <el-button text tag="a" class="nav-link" href="https://github.com/geoearth-dev/geoearth#readme"
          target="_blank" rel="noopener noreferrer">{{ t("nav.docs") }}</el-button>
        <el-button text tag="a" class="nav-link" href="https://github.com/geoearth-dev/geoearth" target="_blank"
          rel="noopener noreferrer">
          <el-icon aria-hidden="true"><Connection /></el-icon><span>{{ t("nav.source") }}</span>
        </el-button>
        <el-dropdown trigger="click" @command="settings.theme = $event">
          <el-button text :aria-label="t('nav.theme')" :title="t('nav.theme')">
            <el-icon aria-hidden="true">
              <Monitor v-if="settings.theme === 'auto'" />
              <Moon v-else-if="colorMode === 'dark'" />
              <Sunny v-else />
            </el-icon>
          </el-button>
          <template #dropdown><el-dropdown-menu>
              <el-dropdown-item v-for="mode in themeModes" :key="mode" :command="mode"
                :class="{ 'is-selected': settings.theme === mode }">{{ t(`theme.${mode}`) }}</el-dropdown-item>
            </el-dropdown-menu></template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="settings.language = $event">
          <el-button text :aria-label="t('nav.language')">{{
            settings.language === "zh-CN" ? "中" : "EN"
          }}</el-button>
          <template #dropdown><el-dropdown-menu>
              <el-dropdown-item command="zh-CN"
                :class="{ 'is-selected': settings.language === 'zh-CN' }">简体中文</el-dropdown-item>
              <el-dropdown-item command="en-US"
                :class="{ 'is-selected': settings.language === 'en-US' }">English</el-dropdown-item>
            </el-dropdown-menu></template>
        </el-dropdown>
      </nav>
    </header>
    <div class="workspace">
      <aside class="activity-rail" :aria-label="t('directory.activity')">
        <div class="rail-main" :aria-label="t('panel.tabs')">
          <el-tooltip v-for="panel in panels" :key="panel.id" :content="t(panel.label)" placement="right">
            <el-button text class="rail-button" :id="panel.id + '-tab'"
              :class="{ active: layout.open && layout.panel === panel.id }" :aria-label="t(panel.label)"
              :aria-pressed="layout.open && layout.panel === panel.id" :aria-controls="panel.id + '-panel'"
              @click="togglePanel(panel.id)">
              <el-icon aria-hidden="true"><component :is="panel.icon" /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
        <EditorSettings />
      </aside>
      <main class="workbench-main">
        <RouterView />
      </main>
    </div>
    <el-dialog v-model="helpOpen" :title="t('guide.title')" width="480px" class="guide-dialog">
      <ol class="help-steps">
        <li v-for="step in ['select', 'run', 'resize', 'settings']" :key="step">
          {{ t(`guide.${step}`) }}
        </li>
      </ol>
      <p class="setting-note">{{ t("guide.note") }}</p>
    </el-dialog>
  </div>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--text);
  background: var(--bg);
  font-size: 14px;
}
.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  height: 56px;
  flex: none;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text);
  width: fit-content;
}
.brand-mark {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--selected);
  border-radius: 9px;
  font-size: 23px;
}
.brand strong {
  font-size: 18px;
  letter-spacing: -0.5px;
}
.brand strong span {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 1.5px;
  font-weight: 500;
  margin-left: 6px;
}
.current-example {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.current-example h1 {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 260px;
}
.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-color-success);
  flex: none;
}
.top-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
.top-actions .el-button {
  padding: 8px;
  text-decoration: none;
}
.workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.activity-rail {
  width: 56px;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-right: 1px solid var(--border);
  background: var(--bg);
  z-index: 5;
}
.rail-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 10px;
}
.workbench-main {
  flex: 1;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.help-steps {
  padding-left: 20px;
  line-height: 1.9;
}
.help-steps li {
  padding: 6px 0;
}

@media (max-width: 1000px) {
  .topbar { gap: 12px; padding-right: 12px; }
  .brand strong span { display: none; }
  .top-actions { gap: 0; }
}
@media (max-width: 720px) {
  .topbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 12px;
    height: 54px;
    padding-left: 10px;
  }
  .brand strong,
  .top-actions > .nav-link { display: none; }
  .current-example { justify-content: center; }
}
</style>
