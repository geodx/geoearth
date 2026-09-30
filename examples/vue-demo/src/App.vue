<script setup lang="ts">
import { provide } from "vue";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import en from "element-plus/es/locale/lang/en";
import WorkbenchLayout from "@/layouts/WorkbenchLayout.vue";
import { createWorkbench, workbenchKey } from "@/composables/useWorkbench";

// 整个工作台共用一份设置和面板状态。
const workbench = createWorkbench();
provide(workbenchKey, workbench);
const { settings } = workbench;
</script>

<template>
  <el-config-provider :locale="settings.language === 'zh-CN' ? zhCn : en">
    <WorkbenchLayout />
  </el-config-provider>
</template>
