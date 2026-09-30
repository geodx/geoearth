import { createI18n } from "vue-i18n";
import zhCN from "./langs/zh-CN/ui.json";
import enUS from "./langs/en-US/ui.json";

export type Language = "zh-CN" | "en-US";

// 当前提供简体中文和英文；中文浏览器使用简体中文，其他语言使用英文。
export const defaultLanguage: Language = navigator.language
  .toLowerCase()
  .startsWith("zh")
  ? "zh-CN"
  : "en-US";

export const i18n = createI18n({
  legacy: false,
  locale: defaultLanguage,
  fallbackLocale: "en-US",
  messages: { "zh-CN": zhCN, "en-US": enUS },
});

export function setLanguage(language: Language) {
  i18n.global.locale.value = language;
  // 同步页面语言，便于屏幕阅读器和浏览器正确识别。
  document.documentElement.lang = language;
}
