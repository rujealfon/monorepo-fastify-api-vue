import { api } from '@/shared/api/client'

export async function getLiveHealthStatus() {
  const response = await api.health.live()

  return response.data.status
}
