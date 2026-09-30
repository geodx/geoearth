<template>
  <div ref="containerRef" class="code-editor"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import { useWorkbench } from "@/composables/useWorkbench";

const { settings, editorTheme } = useWorkbench();
const editorOptions = () => ({
  fontSize: settings.value.fontSize,
  fontFamily: settings.value.fontFamily,
  wordWrap: settings.value.wordWrap ? ("on" as const) : ("off" as const),
  minimap: { enabled: settings.value.minimap },
});

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

globalThis.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (["html", "handlebars", "razor"].includes(label)) {
      return new HtmlWorker();
    }

    return new EditorWorker();
  },
};

const containerRef = ref<HTMLDivElement | null>(null);

// Monaco 实例不需要放进 Vue 的响应式对象。
let editor: monaco.editor.IStandaloneCodeEditor | undefined;
let model: monaco.editor.ITextModel | undefined;
let changeListener: monaco.IDisposable | undefined;

onMounted(() => {
  if (!containerRef.value) return;

  model = monaco.editor.createModel(props.modelValue, "html");

  editor = monaco.editor.create(containerRef.value, {
    model,
    theme: editorTheme.value,
    automaticLayout: true,
    ...editorOptions(),
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: {
      top: 12,
      bottom: 12,
    },
  });

  // 编辑器修改 → 通知父组件。
  changeListener = model.onDidChangeContent(() => {
    const value = model?.getValue();

    if (value !== undefined && value !== props.modelValue) {
      emit("update:modelValue", value);
    }
  });
});

// 父组件修改，例如重置或切换示例 → 同步到编辑器。
watch(
  () => props.modelValue,
  (value) => {
    if (model && model.getValue() !== value) {
      model.setValue(value);
      editor?.setScrollTop(0);
    }
  },
);

watch(
  () => [
    settings.value.fontSize,
    settings.value.fontFamily,
    settings.value.wordWrap,
    settings.value.minimap,
  ],
  () => {
    editor?.updateOptions(editorOptions());
  },
);
watch(editorTheme, (theme) => monaco.editor.setTheme(theme));

onBeforeUnmount(() => {
  changeListener?.dispose();
  editor?.dispose();
  model?.dispose();
});
</script>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
