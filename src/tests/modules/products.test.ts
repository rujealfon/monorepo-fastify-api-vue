import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@/common/constants/index.js'
import { permissions, rolePermissions, roles } from '@/db/schema/index.js'
import { createTestApp, registerAdminAndLogin, registerAndLogin, resetDb } from '@/tests/fixtures/index.js'

describe('products API', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetDb(app)
    token = await registerAdminAndLogin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('pOST /api/v1/products creates a product', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Widget', price: 9.99, stock: 100 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json<{ data: { id: string, name: string } }>()
    expect(body.data.name).toBe('Widget')
    expect(body.data.id).toBeDefined()
  })

  it('gET /api/v1/products returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[] }>()
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('gET /api/v1/products/:id returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('pATCH /api/v1/products/:id updates a product', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Gadget', price: 19.99, stock: 50 },
    })
    const { data: created } = create.json<{ data: { id: string } }>()

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { price: 24.99 },
    })
    expect(update.statusCode).toBe(200)
  })

  it('dELETE /api/v1/products/:id deletes a product', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Doohickey', price: 4.99, stock: 10 },
    })
    const { data: created } = create.json<{ data: { id: string } }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/products/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(del.statusCode).toBe(204)
  })

  describe('regular user role :RBAC', () => {
    let userToken: string

    beforeEach(async () => {
      userToken = await registerAndLogin(app, { email: 'regular@example.com', password: 'Password123' })
    })

    async function revokeProductReadPermission() {
      const [resource, action, scope] = PERMISSIONS.PRODUCT.READ_ANY.split(':')
      const [role] = await app.db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'user')).limit(1)
      const [permission] = await app.db
        .select({ id: permissions.id })
        .from(permissions)
        .where(and(
          eq(permissions.resource, resource),
          eq(permissions.action, action),
          eq(permissions.scope, scope),
        ))
        .limit(1)
      if (!role || !permission)
        throw new Error('seeded user role or product read permission not found')

      await app.db
        .delete(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, permission.id),
        ))
    }

    it('returns 403 for GET /api/v1/products without product read permission', async () => {
      await revokeProductReadPermission()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${userToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for GET /api/v1/products/:id without product read permission', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Gadget', price: 19.99, stock: 50 },
      })
      const { data: created } = create.json<{ data: { id: string } }>()
      await revokeProductReadPermission()

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${created.id}`,
        headers: { authorization: `Bearer ${userToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for POST /api/v1/products', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { name: 'Widget', price: 9.99, stock: 100 },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for PATCH /api/v1/products/:id', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Gadget', price: 19.99, stock: 50 },
      })
      const { data: created } = create.json<{ data: { id: string } }>()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${created.id}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { price: 24.99 },
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for DELETE /api/v1/products/:id', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Doohickey', price: 4.99, stock: 10 },
      })
      const { data: created } = create.json<{ data: { id: string } }>()

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/products/${created.id}`,
        headers: { authorization: `Bearer ${userToken}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })
})
