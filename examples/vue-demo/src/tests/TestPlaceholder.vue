<template>
    <div class="placeholder">
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
        <span>Pending implementation</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => String(route.meta.title ?? 'Test Case'))
const description = computed(() => String(route.meta.description ?? 'This test case has not been implemented yet.'))
</script>
