import { createRouter, createWebHistory } from 'vue-router'

import AboutView from '../views/AboutView.vue'
import HealthView from '../views/HealthView.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/health',
      name: 'health',
      component: HealthView,
    },
  ],
})

export default router
