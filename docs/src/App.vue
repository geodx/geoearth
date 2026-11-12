<script setup lang="ts">
import { watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { language, normalizeLanguage, setLanguage, text } from './locales';
const route = useRoute();
watch(() => route.query.lang, value => { const selected = normalizeLanguage(typeof value === 'string' ? value : undefined); if (selected) setLanguage(selected); });
watch([() => route.name, language], () => { if (route.name !== 'docs') document.title = route.name === 'home' ? text.value.homeTitle : text.value.notFoundMeta; }, { immediate: true });
</script>
<template><RouterView /></template>
