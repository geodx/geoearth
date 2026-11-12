import { computed, ref, watch } from 'vue';
import zh from './zh-CN';
import en from './en';

export type SiteLanguage = 'en' | 'zh-CN';
export type TranslationKey = keyof typeof zh;
const storageKey = 'geoearth-site-language';
export function normalizeLanguage(value: string | null | undefined): SiteLanguage | undefined {
  if (!value) return;
  if (/^zh(?:-|$)/i.test(value)) return 'zh-CN';
  if (/^en(?:-|$)/i.test(value)) return 'en';
}
function initialLanguage(): SiteLanguage {
  const explicit = normalizeLanguage(new URLSearchParams(location.search).get('lang'));
  if (explicit) return explicit;
  try { const saved = normalizeLanguage(localStorage.getItem(storageKey)); if (saved) return saved; } catch { /* Storage can be disabled by the browser. */ }
  return normalizeLanguage(navigator.languages?.[0] || navigator.language) || 'en';
}
export const language = ref<SiteLanguage>(initialLanguage());
export const text = computed(() => language.value === 'zh-CN' ? zh : en);
export function setLanguage(value: SiteLanguage) {
  language.value = value;
  try { localStorage.setItem(storageKey, value); } catch { /* The current selection still works without persistence. */ }
}
watch(language, value => {
  document.documentElement.lang = value;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text.value.homeDescription);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', text.value.homeTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', text.value.homeDescription);
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', value === 'zh-CN' ? 'zh_CN' : 'en_US');
}, { immediate: true });
