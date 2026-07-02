import { createRouter, createWebHistory } from 'vue-router'

import { aboutRoutes } from '@/features/about/routes'
import { healthRoutes } from '@/features/health/routes'
import { homeRoutes } from '@/features/home/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...homeRoutes, ...aboutRoutes, ...healthRoutes],
})

export default router
