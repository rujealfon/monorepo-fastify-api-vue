import type { RouteRecordRaw } from 'vue-router'

export const healthRoutes: RouteRecordRaw[] = [
  {
    path: '/health',
    name: 'health',
    component: () => import('./views/HealthView.vue')
  }
]
