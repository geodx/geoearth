import { createRouter, createWebHashHistory } from 'vue-router'
import Playground from '@/views/Playground.vue'

export const router = createRouter({
    history: createWebHashHistory(),

    routes: [
        {
            path: '/',
            redirect: '/examples/basic',
        },
        {
            path: '/examples/:id',
            name: 'playground',
            component: Playground,
            props: true,
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/examples/basic',
        },
    ],
})