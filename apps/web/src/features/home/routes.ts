import type { RouteRecordRaw } from 'vue-router'

// Root route is eager-loaded because it is needed on initial navigation.
import HomeView from './views/HomeView.vue'

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  }
]
