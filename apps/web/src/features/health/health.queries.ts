import { defineQueryOptions, useQuery } from '@pinia/colada'

import { getLiveHealthStatus } from './health.api'

export const healthLiveQuery = defineQueryOptions({
  key: ['health', 'live'],
  query: getLiveHealthStatus,
})

export function useHealthQuery() {
  return useQuery(healthLiveQuery)
}
