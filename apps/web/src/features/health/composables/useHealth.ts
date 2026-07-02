import { ref } from 'vue'

import { api } from '@/api'

export function useHealth() {
  const status = ref('checking')
  const error = ref('')
  const loading = ref(false)

  async function checkHealth() {
    loading.value = true
    error.value = ''

    try {
      const response = await api.health.live()
      status.value = response.data.status
    }
    catch {
      status.value = 'unavailable'
      error.value = 'Health check failed'
    }
    finally {
      loading.value = false
    }
  }

  return { status, error, loading, checkHealth }
}
