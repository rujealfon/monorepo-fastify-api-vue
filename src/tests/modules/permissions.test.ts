import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { SEED_PERMISSIONS } from '@/db/seed.js'
import { createTestApp, registerAdminAndLogin, registerAndLogin, registerSuperAdminAndLogin, resetDb } from '@/tests/fixtures/index.js'

interface Permission {
  id: string
  resource: string
  action: string
  scope: string
  description: string | null
  createdAt: string
}

describe('permissions API', () => {
  let app: FastifyInstance
  let adminToken: string
  let superAdminToken: string
  let userToken: string

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetDb(app)
    adminToken = await registerAdminAndLogin(app)
    superAdminToken = await registerSuperAdminAndLogin(app)
    userToken = await registerAndLogin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  const auth = (t: string) => ({ authorization: `Bearer ${t}` })

  // ── GET /api/v1/permissions ────────────────────────────────────────────────

  describe('gET /api/v1/permissions', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions' })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for a regular user', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(userToken) })
      expect(res.statusCode).toBe(403)
    })

    it('returns 200 for admin (permission:read:any)', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(adminToken) })
      expect(res.statusCode).toBe(200)
    })

    it('returns 200 for super-admin', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(superAdminToken) })
      expect(res.statusCode).toBe(200)
    })

    it('returns every seeded permission', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(adminToken) })
      const { data } = res.json<{ data: Permission[] }>()
      expect(data).toHaveLength(SEED_PERMISSIONS.length)
    })

    it('returns permissions with correct shape', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(adminToken) })
      const { data } = res.json<{ data: Permission[] }>()
      const perm = data[0]
      expect(perm).toHaveProperty('id')
      expect(perm).toHaveProperty('resource')
      expect(perm).toHaveProperty('action')
      expect(perm).toHaveProperty('scope')
      expect(perm).toHaveProperty('createdAt')
    })

    it('includes all expected resource:action:scope combinations', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(adminToken) })
      const { data } = res.json<{ data: Permission[] }>()
      const keys = data.map(p => `${p.resource}:${p.action}:${p.scope}`)

      const expected = SEED_PERMISSIONS.map(p => `${p.resource}:${p.action}:${p.scope}`)

      for (const key of expected) {
        expect(keys).toContain(key)
      }
    })

    it('returns permissions sorted by resource then action', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: auth(adminToken) })
      const { data } = res.json<{ data: Permission[] }>()
      const permKeys = data.map(p => `${p.resource}:${p.action}`)
      expect(permKeys).toEqual([...permKeys].sort())
    })
  })
})
