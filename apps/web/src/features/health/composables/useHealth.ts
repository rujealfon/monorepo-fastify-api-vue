import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

import { healthLiveQuery } from '@/features/health/queries'

export function useHealth() {
  const query = useQuery(healthLiveQuery)
  const status = computed(() => {
    // Error wins over stale data: after a failed refetch the cache keeps the
    // previous response, which must not read as a healthy status.
    if (query.status.value === 'error')
      return 'unavailable'

    return query.data.value ? query.data.value.data.status : 'checking'
  })
  const error = computed(() => {
    if (query.status.value !== 'error')
      return ''

    const httpStatus = query.error.value?.status
    return httpStatus ? `Health check failed (HTTP ${httpStatus})` : 'Health check failed'
  })
  const loading = computed(() => query.asyncStatus.value === 'loading')
  const checkHealth = () => {
    void query.refetch()
  }

  return { status, error, loading, checkHealth }
}
