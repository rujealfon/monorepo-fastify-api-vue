import type { App } from 'vue'

import { PiniaColada } from '@pinia/colada'
import { createPinia } from 'pinia'

import router from '../router'

export function registerPlugins(app: App) {
  app
    .use(createPinia())
    .use(PiniaColada, {
      queryOptions: {
        staleTime: 5_000,
        gcTime: 5 * 60_000,
      },
    })
    .use(router)
}
