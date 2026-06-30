import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ROLES } from '@/common/constants/index.js'
import { auditLogs, profiles, roles, userRoles, users } from '@/db/schema/index.js'
import { createTestApp, eventually, extractTokenFromCookie, firstCookieHeader, registerAndLogin, registerAndLoginWithUser, resetDb } from '@/tests/fixtures/index.js'

describe('auth API', () => {
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

  // ── POST /api/v1/auth/register ─────────────────────────────────────────────

  describe('/api/v1/auth/register POST', () => {
    it('creates a user and returns id + email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'alice@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(201)
      const { data } = res.json<{ data: { id: string, email: string } }>()
      expect(data.id).toBeDefined()
      expect(data.email).toBe('alice@example.com')
    })

    it('does not return passwordHash in the response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'alice@example.com', password: 'Password123' },
      })
      expect(res.json()).not.toHaveProperty('data.passwordHash')
    })

    it('returns 409 for duplicate email', async () => {
      const payload = { email: 'bob@example.com', password: 'Password123' }
      await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload })
      const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload })
      expect(res.statusCode).toBe(409)
    })

    it('returns 400 for password shorter than 8 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'charlie@example.com', password: 'short' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for password meeting length but not complexity', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'alice@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'Password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when email is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { password: 'Password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'alice@example.com' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── POST /api/v1/auth/login ────────────────────────────────────────────────

  describe('/api/v1/auth/login POST', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'dave@example.com', password: 'Password123' },
      })
    })

    it('sets an httpOnly cookie on valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'dave@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(200)
      const cookie = firstCookieHeader(res.headers['set-cookie'])
      expect(cookie).toMatch(/^token=/)
      expect(cookie).toContain('HttpOnly')
    })

    it('returns user id and email in the response body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'dave@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: { id: string, email: string } }>()
      expect(data.id).toBeDefined()
      expect(data.email).toBe('dave@example.com')
      expect(data).not.toHaveProperty('token')
    })

    it('cookie authenticates protected routes', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'dave@example.com', password: 'Password123' },
      })
      const token = firstCookieHeader(loginRes.headers['set-cookie']).split(';')[0]
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { cookie: token },
      })
      expect(res.statusCode).toBe(200)
    })

    it('returns 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'dave@example.com', password: 'wrongpassword' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 401 for unknown email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ghost@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── POST /api/v1/auth/mobile/login ────────────────────────────────────────────

  describe('/api/v1/auth/mobile/login POST', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'mobile@example.com', password: 'Password123' },
      })
    })

    it('returns token in body and sets no cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': app.config.MOBILE_API_KEY },
        payload: { email: 'mobile@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: { id: string, email: string, token: string } }>()
      expect(data.token).toBeDefined()
      expect(data.id).toBeDefined()
      expect(data.email).toBe('mobile@example.com')
      expect(res.headers['set-cookie']).toBeUndefined()
    })

    it('returns 403 for wrong api key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': 'wrong-key' },
        payload: { email: 'mobile@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 when api key header is absent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        payload: { email: 'mobile@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returned token authenticates protected routes as Bearer', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': app.config.MOBILE_API_KEY },
        payload: { email: 'mobile@example.com', password: 'Password123' },
      })
      const { data } = loginRes.json<{ data: { token: string } }>()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${data.token}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('returns 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': app.config.MOBILE_API_KEY },
        payload: { email: 'mobile@example.com', password: 'wrongpassword' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 401 for unknown email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': app.config.MOBILE_API_KEY },
        payload: { email: 'ghost@example.com', password: 'Password123' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': app.config.MOBILE_API_KEY },
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── POST /api/v1/auth/logout ──────────────────────────────────────────────────

  describe('/api/v1/auth/logout POST ', () => {
    it('clears the token cookie', async () => {
      const token = await registerAndLogin(app, { email: 'logout@example.com', password: 'Password123' })
      const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: `token=${token}` } })
      expect(res.statusCode).toBe(200)
      const cookie = firstCookieHeader(res.headers['set-cookie'])
      expect(cookie).toMatch(/^token=(?:;|$)/)
      expect(cookie).toContain('Max-Age=0')
    })

    it('records the logged-out user in the audit log', async () => {
      const { user, token } = await registerAndLoginWithUser(app, { email: 'logout-audit@example.com', password: 'Password123' })

      await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: `token=${token}` } })

      const [log] = await eventually(
        () => app.db
          .select()
          .from(auditLogs)
          .where(and(eq(auditLogs.action, 'auth.logged_out'), eq(auditLogs.userId, user.id)))
          .limit(1),
        rows => rows.length > 0,
      )
      expect(log.resourceId).toBe(user.id)
    })

    it('records null userId and resourceId when logging out without a token', async () => {
      await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })

      const [log] = await eventually(
        () => app.db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.action, 'auth.logged_out'))
          .limit(1),
        rows => rows.length > 0,
      )
      expect(log.userId).toBeNull()
      expect(log.resourceId).toBeNull()
    })

    it('records the logged-out user in the audit log when using a bearer token', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'mobile-logout@example.com', password: 'Password123' },
      })
      const { data: user } = registerRes.json<{ data: { id: string } }>()
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/login',
        headers: { 'x-mobile-api-key': app.config.MOBILE_API_KEY },
        payload: { email: 'mobile-logout@example.com', password: 'Password123' },
      })
      const { data: { token } } = loginRes.json<{ data: { token: string } }>()

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${token}` },
      })

      const [log] = await eventually(
        () => app.db
          .select()
          .from(auditLogs)
          .where(and(eq(auditLogs.action, 'auth.logged_out'), eq(auditLogs.userId, user.id)))
          .limit(1),
        rows => rows.length > 0,
      )
      expect(log.resourceId).toBe(user.id)
    })
  })

  // ── Account retention: reactivation within the 90-day window ────────────────

  describe('account reactivation', () => {
    const register = (email: string, password: string) =>
      app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email, password } })
    const login = (email: string, password: string) =>
      app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } })

    // Register, then soft-delete the account. Returns the created id.
    async function registerThenDelete(email: string) {
      const { data: created } = (await register(email, 'Password123')).json<{ data: { id: string } }>()
      const token = extractTokenFromCookie((await login(email, 'Password123')).headers['set-cookie'])
      await app.inject({ method: 'DELETE', url: `/api/v1/users/${created.id}`, headers: { authorization: `Bearer ${token}` } })
      return created.id
    }

    async function createLegacyUser(email: string, password: string) {
      const [user] = await app.db.insert(users).values({ email, passwordHash: await bcrypt.hash(password, 12) }).returning({ id: users.id })
      await app.db.insert(profiles).values({ userId: user.id })
      const role = await app.db.query.roles.findFirst({ where: eq(roles.name, ROLES.USER) })
      if (role)
        await app.db.insert(userRoles).values({ userId: user.id, roleId: role.id })
      return user.id
    }

    it('reactivates the same account on re-register with the correct password', async () => {
      const id = await registerThenDelete('erin@example.com')

      const again = await register('erin@example.com', 'Password123')
      expect(again.statusCode).toBe(201)
      expect(again.json<{ data: { id: string } }>().data.id).toBe(id)
      expect((await login('erin@example.com', 'Password123')).statusCode).toBe(200)
    })

    it('reactivates a legacy account with a correct weak password', async () => {
      const email = 'legacy@example.com'
      const password = 'password123'
      const id = await createLegacyUser(email, password)
      const token = extractTokenFromCookie((await login(email, password)).headers['set-cookie'])
      await app.inject({ method: 'DELETE', url: `/api/v1/users/${id}`, headers: { authorization: `Bearer ${token}` } })

      const again = await register(email, password)
      expect(again.statusCode).toBe(201)
      expect(again.json<{ data: { id: string } }>().data.id).toBe(id)
    })

    it('restores the account\'s profile data on reactivation', async () => {
      const email = 'iris@example.com'
      const { data: created } = (await register(email, 'Password123')).json<{ data: { id: string } }>()
      const token = extractTokenFromCookie((await login(email, 'Password123')).headers['set-cookie'])
      const headers = { authorization: `Bearer ${token}` }

      // set some profile data, then self-delete
      await app.inject({ method: 'PATCH', url: `/api/v1/users/${created.id}`, headers, payload: { profile: { firstName: 'Iris' } } })
      await app.inject({ method: 'DELETE', url: `/api/v1/users/${created.id}`, headers })

      // reactivate, then confirm the profile data survived
      await register(email, 'Password123')
      const token2 = extractTokenFromCookie((await login(email, 'Password123')).headers['set-cookie'])
      const me = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { authorization: `Bearer ${token2}` } })
      expect(me.statusCode).toBe(200)
      expect(me.json<{ data: { profile: { firstName: string | null } } }>().data.profile.firstName).toBe('Iris')
    })

    it('reactivated account retains the user role and can access own-account routes', async () => {
      const id = await registerThenDelete('jay@example.com')

      await register('jay@example.com', 'Password123')
      const token = extractTokenFromCookie((await login('jay@example.com', 'Password123')).headers['set-cookie'])

      // user:update:own permission must be restored — self-PATCH requires it
      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { profile: { firstName: 'Jay' } },
      })
      expect(patch.statusCode).toBe(200)
    })

    it('returns 409 when re-registering a soft-deleted account with the wrong password', async () => {
      await registerThenDelete('frank@example.com')

      const again = await register('frank@example.com', 'DifferentPassword1')
      expect(again.statusCode).toBe(409)
    })

    it('does not let a soft-deleted account log in', async () => {
      await registerThenDelete('grace@example.com')
      expect((await login('grace@example.com', 'Password123')).statusCode).toBe(401)
    })

    it('does not block correct-password reactivation after a failed wrong-password attempt', async () => {
      const id = await registerThenDelete('henry@example.com')

      // wrong password → 409, no orphan account created
      expect((await register('henry@example.com', 'WrongPassword1')).statusCode).toBe(409)

      // original password still reactivates the same account
      const again = await register('henry@example.com', 'Password123')
      expect(again.statusCode).toBe(201)
      expect(again.json<{ data: { id: string } }>().data.id).toBe(id)
    })
  })
})
