import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

import { healthLiveQuery } from '@/features/health/queries'

export function useHealth() {
  const query = useQuery(healthLiveQuery)
  const status = computed(() => {
    if (query.data.value)
      return query.data.value.data.status

    if (query.status.value === 'error')
      return 'unavailable'

    return 'checking'
  })
  const error = computed(() => query.status.value === 'error' ? 'Health check failed' : '')
  const loading = computed(() => query.asyncStatus.value === 'loading')
  const checkHealth = () => {
    void query.refetch()
  }

  return { status, error, loading, checkHealth }
}
