import { createRouter, createWebHistory } from 'vue-router'

import { aboutRoutes } from '@/features/about/routes'
import { healthRoutes } from '@/features/health/routes'
import { homeRoutes } from '@/features/home/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/app/layouts/DefaultLayout.vue'),
      children: [...homeRoutes, ...aboutRoutes, ...healthRoutes],
    },
    // Auth feature routes go under AuthLayout once they exist:
    // { path: '/', component: () => import('@/app/layouts/AuthLayout.vue'), children: [...authRoutes] },
  ],
})

export default router
