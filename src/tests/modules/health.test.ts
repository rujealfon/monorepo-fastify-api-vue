import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestApp, registerAdminAndLogin, registerAndLogin, registerSuperAdminAndLogin, resetDb } from '@/tests/fixtures/index.js'

describe('health API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetDb(app)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('get /health/live', () => {
    it('returns 200 without authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/health/live' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ success: true, data: { status: 'ok' } })
    })
  })

  describe('get /health/ready', () => {
    it('returns 200 without authentication when dependencies are reachable', async () => {
      const res = await app.inject({ method: 'GET', url: '/health/ready' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ success: true, data: { status: 'ready' } })
    })
  })

  describe('get /health/details', () => {
    const expectHealthDetails = (body: {
      success: boolean
      data: {
        status: string
        memory: Record<string, unknown>
        underPressure: boolean
      }
    }) => {
      expect(body.success).toBe(true)
      expect(['ok', 'degraded']).toContain(body.data.status)
      expect(body.data.underPressure).toEqual(expect.any(Boolean))
      expect(body.data.memory.heapUsed).toEqual(expect.any(Number))
      expect(body.data.memory.rssBytes).toEqual(expect.any(Number))
      expect(body.data.memory.eventLoopDelay).toEqual(expect.any(Number))
      expect(body.data.memory.eventLoopUtilized).toEqual(expect.any(Number))
    }

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/health/details' })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for regular user role', async () => {
      const token = await registerAndLogin(app, { email: 'user@example.com', password: 'Password123' })
      const res = await app.inject({
        method: 'GET',
        url: '/health/details',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 200 with system details for admin role', async () => {
      const token = await registerAdminAndLogin(app)
      const res = await app.inject({
        method: 'GET',
        url: '/health/details',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      expectHealthDetails(res.json())
    })

    it('returns 200 with system details for super-admin role', async () => {
      const token = await registerSuperAdminAndLogin(app)
      const res = await app.inject({
        method: 'GET',
        url: '/health/details',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      expectHealthDetails(res.json())
    })
  })
})
