<template>
    <div class="app-shell">
        <aside class="app-sidebar">
            <div class="brand">
                <strong>GeoEarth</strong>
                <span>SDK Test Bench</span>
            </div>

            <nav class="test-nav">
                <details
                    v-for="group in testRouteGroups"
                    :key="group.title"
                    class="test-group"
                    open
                >
                    <summary>{{ group.title }}</summary>
                    <RouterLink
                        v-for="item in group.items"
                        :key="item.path"
                        :to="item.path"
                    >
                        {{ item.title }}
                    </RouterLink>
                </details>
            </nav>
        </aside>

        <main class="app-main">
            <header class="test-header">
                <div>
                    <h1>{{ title }}</h1>
                    <p>{{ description }}</p>
                </div>
            </header>

            <section class="test-stage">
                <RouterView />
            </section>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink, RouterView } from 'vue-router'
import { testRouteGroups } from './router'

const route = useRoute()

const title = computed(() => String(route.meta.title ?? 'GeoEarth Test'))
const description = computed(() => String(route.meta.description ?? 'Select a test case from the left.'))
</script>
