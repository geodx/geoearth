<script setup lang="ts">
const paths = {
  arrow: ['M4 12h16m-6-6 6 6-6 6'],
  external: ['M14 4h6v6m0-6-10 10', 'M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5'],
  layers: ['m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5'],
  pen: ['m15 4 5 5-11 11-6 1 1-6L15 4Zm-9 9 5 5M13 6l5 5'],
  terrain: ['m2 20 7-15 5 9 3-6 5 12H2Zm4-8 3 2 2-2'],
  chart: ['M4 20V10m5 10V4m6 16v-7m5 7V7M2 22h20'],
  copy: ['M9 8V4h11v13h-4', 'M4 8h12v14H4V8Z'],
  check: ['m5 12 4 4L20 5'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M18 6 6 18'],
  chevron: ['m7 10 5 5 5-5'],
  github: ['M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.2-2-1-2 3-.3 6-1.5 6-6 0-1.3-.5-2.4-1.3-3.2.2-.8.2-2.2-.2-3.3-1.7 0-3.3 1.4-3.3 1.4a12 12 0 0 0-6.4 0S7.2 3.5 5.5 3.5c-.4 1.1-.4 2.5-.2 3.3A4.5 4.5 0 0 0 4 10c0 4.5 3 5.7 6 6-.8.5-1 1.5-1 2v4'],
} as const;
defineProps<{ name: keyof typeof paths }>();
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, index) in paths[name]" :key="index" :d="d" />
  </svg>
</template>
