import {
  computed,
  inject,
  reactive,
  watch,
  type InjectionKey,
} from "vue";
import { useColorMode, useStorage } from "@vueuse/core";
import { defaultLanguage, setLanguage } from "@/locales/i18n";

export function createWorkbench() {
  const settings = useStorage(
    "geoearth-playground-settings",
    {
      theme: "dark" as "dark" | "light" | "auto",
      language: defaultLanguage,
      editorTheme: "auto",
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      wordWrap: true,
      minimap: false,
    },
    undefined,
    { mergeDefaults: true },
  );
  // 已保存的选择优先于浏览器语言，初始化和后续切换都在这里同步。
  watch(() => settings.value.language, setLanguage, { immediate: true });

  const layout = reactive({
    panel: "code" as "directory" | "code",
    open: true,
  });
  const colorMode = useColorMode({
    storageRef: computed({
      get: () => settings.value.theme,
      set: (theme) => {
        settings.value.theme = theme;
      },
    }),
  });
  const editorTheme = computed(() =>
    settings.value.editorTheme === "auto"
      ? colorMode.value === "dark"
        ? "vs-dark"
        : "vs"
      : settings.value.editorTheme,
  );

  return { settings, layout, colorMode, editorTheme };
}

type Workbench = ReturnType<typeof createWorkbench>;
export const workbenchKey: InjectionKey<Workbench> = Symbol("workbench");
export function useWorkbench() {
  const state = inject(workbenchKey);
  if (!state) throw new Error("Workbench provider is missing");
  return state;
}
