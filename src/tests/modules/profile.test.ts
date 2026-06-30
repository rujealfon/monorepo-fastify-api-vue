import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestApp, registerAndLogin, resetDb } from '@/tests/fixtures/index.js'

describe('profile API', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetDb(app)
    token = await registerAndLogin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  // ── GET /api/v1/profile ────────────────────────────────────────────────────

  describe('gET /api/v1/profile', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/profile' })
      expect(res.statusCode).toBe(401)
    })

    it('returns the authenticated user with correct shape', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      const { success, data } = res.json<{ success: boolean, data: Record<string, unknown> }>()
      expect(success).toBe(true)
      expect(data).toHaveProperty('id')
      expect(data.email).toBe('test@example.com')
      expect(data).toHaveProperty('profile')
      expect(data).toHaveProperty('roles')
      expect(data.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'user' })]))
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('updatedAt')
      expect(data).not.toHaveProperty('passwordHash')
    })

    it('returns the user that matches the JWT, not another user', async () => {
      const otherToken = await registerAndLogin(app, { email: 'other@example.com', password: 'Password123' })
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${otherToken}` },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: { email: string } }>()
      expect(data.email).toBe('other@example.com')
    })
  })
})
