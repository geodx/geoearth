<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWorkbench } from "@/composables/useWorkbench";
import { Setting } from "@element-plus/icons-vue";

const { t } = useI18n();
const { settings } = useWorkbench();
const visible = ref(false);
const fonts = [
  { label: "Consolas", value: 'Consolas, "Courier New", monospace' },
  { label: "Cascadia Code", value: '"Cascadia Code", Consolas, monospace' },
  { label: "Courier New", value: '"Courier New", monospace' },
];
</script>

<template>
  <el-popover
    v-model:visible="visible"
    trigger="click"
    placement="right-end"
    :width="340"
    :title="t('settings.title')"
    popper-class="editor-settings"
  >
    <template #reference>
      <el-button
        text
        class="rail-button"
        :aria-label="t('settings.title')"
        :title="t('settings.title')"
      >
        <el-icon aria-hidden="true"><Setting /></el-icon>
      </el-button>
    </template>
    <p class="setting-note">{{ t("settings.hint") }}</p>
    <el-form label-position="left" label-width="112px" size="small">
      <el-form-item :label="t('settings.theme')">
        <el-select
          v-model="settings.editorTheme"
          :aria-label="t('settings.theme')"
        >
          <el-option value="auto" :label="t('settings.follow')" />
          <el-option value="vs-dark" :label="t('theme.dark')" />
          <el-option value="vs" :label="t('theme.light')" />
          <el-option value="hc-black" :label="t('settings.contrast')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('settings.font')">
        <el-select
          v-model="settings.fontFamily"
          :aria-label="t('settings.font')"
        >
          <el-option v-for="font in fonts" :key="font.value" v-bind="font" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('settings.size')">
        <el-input-number
          v-model="settings.fontSize"
          :min="12"
          :max="24"
          :value-on-clear="14"
          controls-position="right"
          :aria-label="t('settings.size')"
        />
      </el-form-item>
      <el-form-item :label="t('settings.wrap')">
        <el-switch
          v-model="settings.wordWrap"
          :aria-label="t('settings.wrap')"
        />
      </el-form-item>
      <el-form-item :label="t('settings.minimap')">
        <el-switch
          v-model="settings.minimap"
          :aria-label="t('settings.minimap')"
        />
      </el-form-item>
    </el-form>
    <div class="settings-footer">
      <small>{{ t("settings.note") }}</small
      ><el-button type="primary" size="small" @click="visible = false">{{
        t("settings.done")
      }}</el-button>
    </div>
  </el-popover>
</template>

<style scoped>
.settings-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: var(--muted);
}
</style>
