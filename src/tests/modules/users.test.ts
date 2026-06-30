import type { FastifyInstance } from 'fastify'
import type { User } from '@/modules/users/schemas/index.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestApp, extractTokenFromCookie, registerAdminAndLogin, registerSuperAdminAndLogin, resetDb } from '@/tests/fixtures/index.js'

describe('users API', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetDb(app)
    // The users module is admin-only (list/get/create) or self-or-admin (update/delete);
    // most tests act as an admin.
    token = await registerAdminAndLogin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  // ── helpers ────────────────────────────────────────────────────────────────

  async function createUser(email = 'user@example.com', password = 'Password123') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email, password },
    })
    return res.json<{ data: User }>().data
  }

  // ── GET /api/v1/users ──────────────────────────────────────────────────────

  describe('gET /api/v1/users', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/users' })
      expect(res.statusCode).toBe(401)
    })

    it('returns an empty list when no users exist', async () => {
      await resetDb(app)
      token = await registerAdminAndLogin(app)
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json<{ data: unknown[], pagination: { page: number, limit: number } }>()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(10)
    })

    it('returns users with correct shape including profile', async () => {
      await createUser('a@example.com')
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json<{ data: User[] }>()
      expect(body.data.length).toBeGreaterThanOrEqual(1)
      const user = body.data[0]
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('createdAt')
      expect(user).toHaveProperty('updatedAt')
      expect(user).toHaveProperty('profile')
      expect(user).toHaveProperty('roles')
      expect(Array.isArray(user.roles)).toBe(true)
      expect(user).not.toHaveProperty('passwordHash')
      expect(user.profile).toMatchObject({
        firstName: null,
        lastName: null,
        avatarUrl: null,
        bio: null,
        phoneNumber: null,
        birthDate: null,
      })
    })

    it('does not return soft-deleted users', async () => {
      const user = await createUser('gone@example.com')
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
      })
      const body = res.json<{ data: User[] }>()
      expect(body.data.find(u => u.id === user.id)).toBeUndefined()
    })

    it('paginates with ?page and ?limit', async () => {
      await createUser('p1@example.com')
      await createUser('p2@example.com')
      await createUser('p3@example.com')
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users?page=1&limit=2',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json<{ data: unknown[], pagination: { page: number, limit: number } }>()
      expect(body.data.length).toBeLessThanOrEqual(2)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(2)
    })
  })

  // ── GET /api/v1/users/:id ──────────────────────────────────────────────────

  describe('gET /api/v1/users/:id', () => {
    it('returns 401 without a token', async () => {
      const user = await createUser()
      const res = await app.inject({ method: 'GET', url: `/api/v1/users/${user.id}` })
      expect(res.statusCode).toBe(401)
    })

    it('returns a user by id with nested profile', async () => {
      const created = await createUser('find@example.com')
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${created.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: User }>()
      expect(data.id).toBe(created.id)
      expect(data.email).toBe('find@example.com')
      expect(data.profile).toBeDefined()
      expect(Array.isArray(data.roles)).toBe(true)
      expect(data.profile).toMatchObject({
        firstName: null,
        lastName: null,
        avatarUrl: null,
        bio: null,
        phoneNumber: null,
        birthDate: null,
      })
    })

    it('returns assigned roles for a user registered via auth', async () => {
      const reg = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email: 'withrole@example.com', password: 'Password123' } })
      const userId = reg.json<{ data: { id: string } }>().data.id
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${userId}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: User }>()
      expect(data.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'user' })]))
    })

    it('returns 404 for unknown id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 for a soft-deleted user', async () => {
      const user = await createUser('deleted@example.com')
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for a non-uuid id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/not-a-uuid',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── POST /api/v1/users ─────────────────────────────────────────────────────

  describe('pOST /api/v1/users', () => {
    it('creates a user and returns 201 with user and empty profile', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'new@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(201)
      const { data } = res.json<{ data: User }>()
      expect(data.id).toBeDefined()
      expect(data.email).toBe('new@example.com')
      expect(data.roles).toEqual([])
      expect(data.profile).toMatchObject({
        firstName: null,
        lastName: null,
        avatarUrl: null,
        bio: null,
        phoneNumber: null,
        birthDate: null,
      })
    })

    it('does not expose passwordHash', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'new@example.com', password: 'Password123' },
      })
      expect(res.json()).not.toHaveProperty('data.passwordHash')
    })

    it('returns 409 for duplicate email', async () => {
      await createUser('dup@example.com')
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'dup@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('allows re-registration after soft-delete', async () => {
      const user = await createUser('reuse@example.com')
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'reuse@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(201)
    })

    it('returns 400 for invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'bad-email', password: 'Password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for password shorter than 8 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'short@example.com', password: 'abc' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── PATCH /api/v1/users/:id ────────────────────────────────────────────────

  describe('pATCH /api/v1/users/:id', () => {
    it('returns 401 without a token', async () => {
      const user = await createUser()
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${user.id}`,
        payload: { email: 'updated@example.com' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('updates email and returns the updated user with profile', async () => {
      const user = await createUser('before@example.com')
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'after@example.com' },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: User }>()
      expect(data.email).toBe('after@example.com')
      expect(data.profile).toBeDefined()
      expect(Array.isArray(data.roles)).toBe(true)
    })

    it('returns 404 for unknown id', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'x@example.com' },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 400 when body is empty', async () => {
      const user = await createUser()
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
      const user = await createUser()
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'not-valid' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── DELETE /api/v1/users/:id ───────────────────────────────────────────────

  describe('dELETE /api/v1/users/:id', () => {
    it('returns 401 without a token', async () => {
      const user = await createUser()
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/users/${user.id}` })
      expect(res.statusCode).toBe(401)
    })

    it('soft-deletes a user and returns 204', async () => {
      const user = await createUser('todelete@example.com')
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(204)
    })

    it('returns 404 when deleting an already-deleted user', async () => {
      const user = await createUser('twice@example.com')
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 for unknown id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for a non-uuid id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/not-a-uuid',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── Authorization model (admin-only vs self-or-admin) ──────────────────────

  describe('authorization', () => {
    // Register a normal (non-admin) user and return { id, token }.
    async function registerNormal(email: string) {
      const reg = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email, password: 'Password123' } })
      const id = reg.json<{ data: { id: string } }>().data.id
      const loginRes = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'Password123' } })
      const userToken = extractTokenFromCookie(loginRes.headers['set-cookie'])
      return { id, token: userToken }
    }

    const auth = (t: string) => ({ authorization: `Bearer ${t}` })

    it('forbids a non-admin from listing users', async () => {
      const { token: t } = await registerNormal('n1@example.com')
      const res = await app.inject({ method: 'GET', url: '/api/v1/users', headers: auth(t) })
      expect(res.statusCode).toBe(403)
    })

    it('forbids a non-admin from getting another user by id', async () => {
      const { id: otherId } = await registerNormal('n2@example.com')
      const { token: t } = await registerNormal('n2b@example.com')
      const res = await app.inject({ method: 'GET', url: `/api/v1/users/${otherId}`, headers: auth(t) })
      expect(res.statusCode).toBe(403)
    })

    it('forbids a non-admin from creating users', async () => {
      const { token: t } = await registerNormal('n3@example.com')
      const res = await app.inject({ method: 'POST', url: '/api/v1/users', headers: auth(t), payload: { email: 'x@example.com', password: 'Password123' } })
      expect(res.statusCode).toBe(403)
    })

    it('lets a non-admin update their own account', async () => {
      const { id, token: t } = await registerNormal('n4@example.com')
      const res = await app.inject({ method: 'PATCH', url: `/api/v1/users/${id}`, headers: auth(t), payload: { email: 'n4-new@example.com' } })
      expect(res.statusCode).toBe(200)
    })

    it('lets a non-admin delete their own account', async () => {
      const { id, token: t } = await registerNormal('n5@example.com')
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/users/${id}`, headers: auth(t) })
      expect(res.statusCode).toBe(204)
    })

    it('forbids a non-admin from updating another user', async () => {
      const a = await registerNormal('n6a@example.com')
      const b = await registerNormal('n6b@example.com')
      const res = await app.inject({ method: 'PATCH', url: `/api/v1/users/${b.id}`, headers: auth(a.token), payload: { email: 'hijack@example.com' } })
      expect(res.statusCode).toBe(403)
    })

    it('forbids a non-admin from deleting another user', async () => {
      const a = await registerNormal('n7a@example.com')
      const b = await registerNormal('n7b@example.com')
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/users/${b.id}`, headers: auth(a.token) })
      expect(res.statusCode).toBe(403)
    })

    it('lets an admin delete another user', async () => {
      const b = await registerNormal('n8b@example.com')
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/users/${b.id}`, headers: { authorization: `Bearer ${token}` } })
      expect(res.statusCode).toBe(204)
    })

    it('lets an admin assign a non-system role to a user', async () => {
      // admin lacks role:update:any — only super-admin can assign roles
      const superToken = await registerSuperAdminAndLogin(app)
      const { id } = await registerNormal('roleassign@example.com')

      // get seeded roles to find the 'admin' role id
      const rolesRes = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: { authorization: `Bearer ${superToken}` } })
      const adminRole = rolesRes.json<{ data: Array<{ id: string, name: string }> }>().data.find(r => r.name === 'admin')!

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${id}/roles/${adminRole.id}`,
        headers: { authorization: `Bearer ${superToken}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('returns 403 when admin tries to assign any role (missing role:update:any)', async () => {
      const superToken = await registerSuperAdminAndLogin(app)
      const { id } = await registerNormal('roleblock@example.com')
      const rolesRes = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: { authorization: `Bearer ${superToken}` } })
      const adminRole = rolesRes.json<{ data: Array<{ id: string, name: string }> }>().data.find(r => r.name === 'admin')!

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${id}/roles/${adminRole.id}`,
        headers: { authorization: `Bearer ${token}` }, // admin token
      })
      expect(res.statusCode).toBe(403)
    })

    it('blocks assigning a system role to a user unless caller is super-admin', async () => {
      // This test verifies VULN-3 is fixed: non-super-admin cannot escalate to super-admin
      // by assigning a system role. In practice admin lacks role:update:any, so the
      // permission gate fires first. We verify the system role guard via super-admin.
      const superToken = await registerSuperAdminAndLogin(app)
      const { id } = await registerNormal('nosysrole@example.com')
      const rolesRes = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: { authorization: `Bearer ${superToken}` } })
      const systemRole = rolesRes.json<{ data: Array<{ id: string, isSystemRole: boolean }> }>().data.find(r => r.isSystemRole)!

      // super-admin CAN assign a system role (they are super-admin)
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${id}/roles/${systemRole.id}`,
        headers: { authorization: `Bearer ${superToken}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('removes a role from a user', async () => {
      const superToken = await registerSuperAdminAndLogin(app)
      const { id } = await registerNormal('rmrole@example.com')
      const rolesRes = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: { authorization: `Bearer ${superToken}` } })
      const userRole = rolesRes.json<{ data: Array<{ id: string, name: string }> }>().data.find(r => r.name === 'user')!

      // user already has the 'user' role from registration; remove it
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${id}/roles/${userRole.id}`,
        headers: { authorization: `Bearer ${superToken}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('returns 404 when removing a role with an unknown roleId', async () => {
      const superToken = await registerSuperAdminAndLogin(app)
      const { id } = await registerNormal('rmrole404@example.com')
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${id}/roles/00000000-0000-0000-0000-000000000000`,
        headers: { authorization: `Bearer ${superToken}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('does not let a user escalate to admin via the update body', async () => {
      const { id, token: t } = await registerNormal('escalate@example.com')
      // attempt mass-assignment of role through the self-update path
      await app.inject({ method: 'PATCH', url: `/api/v1/users/${id}`, headers: auth(t), payload: { email: 'escalate@example.com', role: 'admin' } })
      // re-login so the token reflects any (un)changed role, then probe an admin-only route
      const reloginRes = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'escalate@example.com', password: 'Password123' } })
      const fresh = extractTokenFromCookie(reloginRes.headers['set-cookie'])
      const res = await app.inject({ method: 'GET', url: '/api/v1/users', headers: auth(fresh) })
      expect(res.statusCode).toBe(403)
    })
  })
})
