import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RpcError } from '@/contract/client.js'

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
        credentials: 'include',
      }),
    )
  })

  it('sends bearer tokens for permission-only routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const client = createApiClient('https://api.example.com', { getToken: () => 'admin-token' })

    await client.users.list()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/users',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
        credentials: 'include',
      }),
    )
  })

  it('wraps non-json error responses in RpcError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<h1>bad gateway</h1>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    )
    const client = createApiClient('https://api.example.com')

    await expect(client.health.live()).rejects.toMatchObject({
      status: 502,
      data: { error: { code: 'HTTP_ERROR', message: '<h1>bad gateway</h1>' } },
    } satisfies Partial<RpcError>)
  })
})
