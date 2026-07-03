import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'

export const HEALTH_KEYS = {
  root: ['health'] as const,
  live: () => [...HEALTH_KEYS.root, 'live'] as const,
}

export const healthLiveQuery = defineQueryOptions({
  key: HEALTH_KEYS.live(),
  query: () => api.health.live(),
})
