import { eq, sql } from 'drizzle-orm'
import { buildApp } from '@/app.js'
import { roles, userRoles, users } from '@/db/schema/index.js'
import { seedRoles } from '@/db/seed.js'

export async function createTestApp() {
  const app = await buildApp()
  await app.ready()
  return app
}

export async function resetDb(app: Awaited<ReturnType<typeof createTestApp>>) {
  await app.db.execute(sql`
    truncate table role_permissions, user_roles, permissions, roles,
      products, audit_logs, profiles, users
    restart identity cascade
  `)
  await seedRoles(app.db)
}

export async function registerAndLogin(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user = { email: 'test@example.com', password: 'Password123' },
) {
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: user,
  })
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: user.email, password: user.password },
  })
  return extractTokenFromCookie(res.headers['set-cookie'])
}

async function registerWithRoleAndLogin(
  app: Awaited<ReturnType<typeof createTestApp>>,
  roleName: string,
  user: { email: string, password: string },
) {
  await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: user })
  const [role, userRow] = await Promise.all([
    app.db.query.roles.findFirst({ where: eq(roles.name, roleName) }),
    app.db.query.users.findFirst({ where: eq(users.email, user.email) }),
  ])
  if (role && userRow)
    await app.db.insert(userRoles).values({ userId: userRow.id, roleId: role.id }).onConflictDoNothing()
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: user })
  return extractTokenFromCookie(res.headers['set-cookie'])
}

export function registerAdminAndLogin(app: Awaited<ReturnType<typeof createTestApp>>, user = { email: 'admin@example.com', password: 'Password123' }) {
  return registerWithRoleAndLogin(app, 'admin', user)
}

export function registerSuperAdminAndLogin(app: Awaited<ReturnType<typeof createTestApp>>, user = { email: 'superadmin@example.com', password: 'Password123' }) {
  return registerWithRoleAndLogin(app, 'super-admin', user)
}

export function firstCookieHeader(setCookie: string | string[] | undefined): string {
  return Array.isArray(setCookie) ? setCookie[0] : setCookie ?? ''
}

export function extractTokenFromCookie(setCookie: string | string[] | undefined): string {
  const token = firstCookieHeader(setCookie).split(';')[0].replace(/^token=/, '')
  if (!token)
    throw new Error('token cookie not found in Set-Cookie header')
  return token
}

export const delay = () => new Promise<void>(r => setTimeout(r, 50))

export async function eventually<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 10; i++) {
    const value = await read()
    if (done(value))
      return value
    await delay()
  }
  throw new Error('eventually: condition never satisfied after 10 retries')
}

export async function registerAndLoginWithUser(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user = { email: 'test@example.com', password: 'Password123' },
) {
  const registerRes = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: user })
  const { data } = registerRes.json<{ data: { id: string, email: string } }>()
  const loginRes = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: user })
  return { user: data, token: extractTokenFromCookie(loginRes.headers['set-cookie']) }
}
