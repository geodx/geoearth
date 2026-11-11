import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/docs', redirect: '/docs/getting-started' },
    { path: '/docs/:slug', name: 'docs', component: () => import('./views/DocsView.vue'), props: true },
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue') },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, top: 104, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' };
    return { top: 0 };
  },
});

router.afterEach(to => {
  if (to.name === 'home') document.title = 'GeoEarth · 让三维地理开发更简单';
});
