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
})
