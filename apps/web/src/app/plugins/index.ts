import type { App } from 'vue'

import { PiniaColada } from '@pinia/colada'
import { createPinia } from 'pinia'

import { coladaOptions } from './pinia-colada'

export function registerPlugins(app: App) {
  app.use(createPinia())
  app.use(PiniaColada, coladaOptions)
}
