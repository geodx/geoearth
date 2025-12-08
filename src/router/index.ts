import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      name: 'login',
      path: '/login',
      component: () => import('../views/Login/index.vue')
    },
    {
      name: 'TechnologyScreen',
      path: '/TechnologyScreen',
      component: () => import('../views/TechnologyScreen/index.vue')
    },
    {
      name: 'example',
      path: '/example/:demoPid?',
      component: () => import('../views/Example/index.vue')
    },
  ],
})

export default router
