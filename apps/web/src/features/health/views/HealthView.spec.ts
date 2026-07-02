import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HealthView from './HealthView.vue'

const { live } = vi.hoisted(() => ({
  live: vi.fn(),
}))

vi.mock('@/api', () => ({
  api: {
    health: { live },
  },
}))

describe('healthView', () => {
  beforeEach(() => {
    live.mockReset()
  })

  it('shows live health status', async () => {
    live.mockResolvedValue({ data: { status: 'ok' } })

    const wrapper = mount(HealthView)
    await flushPromises()

    expect(live).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('ok')
  })

  it('shows an error when the health check fails', async () => {
    live.mockRejectedValue(new Error('down'))

    const wrapper = mount(HealthView)
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed')
  })
})
