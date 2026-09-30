<template>
  <div
    class="panel-split"
    :class="{ 'first-collapsed': collapsed }"
    role="group"
    :aria-label="label"
  >
    <Splitpanes
      class="workbench-split"
      :maximize-panes="false"
      :push-other-panes="false"
      @resized="rememberSize"
    >
      <!-- 保留两个 Pane；收起时仅调整尺寸，不销毁 Monaco 或 iframe。 -->
      <Pane
        :size="collapsed ? 0 : savedSize"
        :min-size="collapsed ? 0 : minSize"
        :max-size="collapsed ? 0 : maxSize"
        :inert="collapsed"
        ><slot name="first"
      /></Pane>
      <Pane :size="collapsed ? 100 : 100 - savedSize" :min-size="100 - maxSize">
        <slot name="second" />
      </Pane>
    </Splitpanes>
    <slot name="overlay" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Pane, Splitpanes, type SplitpanesResizedPayload } from "splitpanes";

const props = withDefaults(
  defineProps<{
    label: string;
    collapsed?: boolean;
    initialSize?: number;
    minSize?: number;
    maxSize?: number;
  }>(),
  { collapsed: false, initialSize: 50, minSize: 25, maxSize: 75 },
);
const savedSize = ref(props.initialSize);
function rememberSize({ panes, event }: SplitpanesResizedPayload) {
  if (!props.collapsed && event && panes[0]) savedSize.value = panes[0].size;
}
</script>

<style scoped>
.panel-split {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.workbench-split > :deep(.splitpanes__pane) {
  min-width: 0;
  min-height: 0;
  transition: none;
}
.workbench-split > :deep(.splitpanes__pane:first-child) {
  position: relative;
  overflow: visible;
  z-index: 2;
}
.workbench-split > :deep(.splitpanes__splitter) {
  flex: 0 0 4px;
  background: var(--border);
}
.workbench-split > :deep(.splitpanes__splitter:hover),
.workbench-split > :deep(.splitpanes__splitter:focus-visible) {
  background: var(--accent);
  outline: none;
}
.first-collapsed > .workbench-split > :deep(.splitpanes__splitter) {
  display: none;
}

@media (max-width: 720px) {
  .workbench-split > :deep(.splitpanes__pane:first-child) {
    position: absolute;
    inset: 0 auto 0 0;
    width: min(440px, calc(100% - 28px)) !important;
    z-index: 4;
    box-shadow: 12px 0 30px #0003;
  }
  .first-collapsed > .workbench-split > :deep(.splitpanes__pane:first-child) {
    width: 0 !important;
  }
  .workbench-split > :deep(.splitpanes__pane:last-child) { width: 100% !important; }
  .workbench-split > :deep(.splitpanes__splitter) { display: none; }
}
</style>
