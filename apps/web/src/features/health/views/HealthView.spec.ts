import { RpcError } from '@monorepo-fastify-api-vue/api-client'
import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HealthView from './HealthView.vue'

const { live } = vi.hoisted(() => ({
  live: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({
  api: {
    health: { live }
  }
}))

describe('healthView', () => {
  beforeEach(() => {
    live.mockReset()
  })

  function mountHealthView() {
    return mount(HealthView, {
      global: {
        plugins: [
          createPinia(),
          [PiniaColada, { queryOptions: { staleTime: 0 } }]
        ]
      }
    })
  }

  it('shows live health status', async () => {
    live.mockResolvedValue({ data: { status: 'ok' } })

    const wrapper = mountHealthView()
    await flushPromises()

    expect(live).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('ok')
  })

  it('shows an error when the health check fails', async () => {
    live.mockRejectedValue(new Error('down'))

    const wrapper = mountHealthView()
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed')
  })

  it('includes the HTTP status when the health check fails with an RpcError', async () => {
    live.mockRejectedValue(new RpcError(503, { error: 'down' }))

    const wrapper = mountHealthView()
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed (HTTP 503)')
  })

  it('prefers the error state over stale data after a failed refetch', async () => {
    live.mockResolvedValueOnce({ data: { status: 'ok' } })
    live.mockRejectedValueOnce(new Error('down'))

    const wrapper = mountHealthView()
    await flushPromises()
    expect(wrapper.text()).toContain('ok')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed')
  })
})
