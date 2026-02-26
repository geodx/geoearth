import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      name: 'largeScreen',
      path: '/largeScreen',
      component: () => import('../views/LargeScreen/index.vue')
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
      name: 'VRScreen',
      path: '/VRScreen',
      component: () => import('../views/VRScreen/index.vue')
    },
    {
      name: 'example',
      path: '/example/:demoPid?',
      component: () => import('../views/Example/index.vue')
    },
  ],
})
router.beforeEach((to, from, next) => {
  let userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    userInfo = JSON.parse(userInfo) || {};
    next();
  } else if (to.path === '/login' || to.path === '/' || to.path === '/blank' || to.path === '/404') {
    next();
  } else {
    next({ path: '/login' });
  }
});
export default router
