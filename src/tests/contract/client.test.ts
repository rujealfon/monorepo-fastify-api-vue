import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '@/contract/client.js'

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends bearer tokens for optional-auth logout routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const client = createApiClient('https://api.example.com', { getToken: () => 'mobile-token' })

    await client.auth.logout()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer mobile-token' }),
      }),
    )
  })
})
