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

  async function createProduct(name = 'Widget') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name, price: 9.99, stock: 100 }
    })
    return res.json<{ data: { id: string, name: string } }>().data
  }

  it('pOST /api/v1/products creates a product', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Widget', price: 9.99, stock: 100 }
    })
    expect(res.statusCode).toBe(201)
    const body = res.json<{ data: { id: string, name: string } }>()
    expect(body.data.name).toBe('Widget')
    expect(body.data.id).toBeDefined()
  })

  it('pOST /api/v1/products returns 401 without a token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: { name: 'Widget', price: 9.99, stock: 100 }
    })
    expect(res.statusCode).toBe(401)
  })

  it('pOST /api/v1/products returns 400 for invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '', price: -1, stock: 1.5 }
    })
    expect(res.statusCode).toBe(400)
  })

  it('gET /api/v1/products returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[] }>()
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('gET /api/v1/products returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/products' })
    expect(res.statusCode).toBe(401)
  })

  it('gET /api/v1/products paginates with page and limit', async () => {
    await createProduct('Page 1')
    await createProduct('Page 2')
    await createProduct('Page 3')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products?page=1&limit=2',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[], pagination: { page: number, limit: number, total: number } }>()
    expect(body.data).toHaveLength(2)
    expect(body.pagination).toMatchObject({ page: 1, limit: 2, total: 3 })
  })

  it('gET /api/v1/products/:id returns a product', async () => {
    const product = await createProduct('Find Me')
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${product.id}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ data: { id: string, name: string } }>().data).toMatchObject(product)
  })

  it('gET /api/v1/products/:id returns 401 without a token', async () => {
    const product = await createProduct()
    const res = await app.inject({ method: 'GET', url: `/api/v1/products/${product.id}` })
    expect(res.statusCode).toBe(401)
  })

  it('gET /api/v1/products/:id returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('gET /api/v1/products/:id returns 400 for a non-uuid id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products/not-a-uuid',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(400)
  })

  it('pATCH /api/v1/products/:id updates a product', async () => {
    const created = await createProduct('Gadget')

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { price: 24.99 }
    })
    expect(update.statusCode).toBe(200)
  })

  it('pATCH /api/v1/products/:id returns 401 without a token', async () => {
    const created = await createProduct()
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${created.id}`,
      payload: { price: 24.99 }
    })
    expect(res.statusCode).toBe(401)
  })

  it('pATCH /api/v1/products/:id returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
      payload: { price: 24.99 }
    })
    expect(res.statusCode).toBe(404)
  })

  it('pATCH /api/v1/products/:id returns 400 for invalid requests', async () => {
    const created = await createProduct()
    const cases = [
      { url: `/api/v1/products/${created.id}`, payload: {} },
      { url: `/api/v1/products/${created.id}`, payload: { price: -1 } },
      { url: `/api/v1/products/${created.id}`, payload: { stock: 1.5 } },
      { url: '/api/v1/products/not-a-uuid', payload: { price: 24.99 } }
    ]

    for (const testCase of cases) {
      const res = await app.inject({
        method: 'PATCH',
        url: testCase.url,
        headers: { authorization: `Bearer ${token}` },
        payload: testCase.payload
      })
      expect(res.statusCode).toBe(400)
    }
  })

  it('dELETE /api/v1/products/:id deletes a product', async () => {
    const created = await createProduct('Doohickey')

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/products/${created.id}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(del.statusCode).toBe(204)
  })

  it('dELETE /api/v1/products/:id hides the product from reads', async () => {
    const created = await createProduct('Deleted Product')
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/products/${created.id}`,
      headers: { authorization: `Bearer ${token}` }
    })

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${created.id}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(get.statusCode).toBe(404)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(list.json<{ data: Array<{ id: string }> }>().data.find(p => p.id === created.id)).toBeUndefined()
  })

  it('dELETE /api/v1/products/:id returns 401 without a token', async () => {
    const created = await createProduct()
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/products/${created.id}` })
    expect(res.statusCode).toBe(401)
  })

  it('dELETE /api/v1/products/:id returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/products/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('dELETE /api/v1/products/:id returns 400 for a non-uuid id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/products/not-a-uuid',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(400)
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
          eq(permissions.scope, scope)
        ))
        .limit(1)
      if (!role || !permission)
        throw new Error('seeded user role or product read permission not found')

      await app.db
        .delete(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, permission.id)
        ))
    }

    it('returns 403 for GET /api/v1/products without product read permission', async () => {
      await revokeProductReadPermission()

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${userToken}` }
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for GET /api/v1/products/:id without product read permission', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Gadget', price: 19.99, stock: 50 }
      })
      const { data: created } = create.json<{ data: { id: string } }>()
      await revokeProductReadPermission()

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${created.id}`,
        headers: { authorization: `Bearer ${userToken}` }
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for POST /api/v1/products', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { name: 'Widget', price: 9.99, stock: 100 }
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for PATCH /api/v1/products/:id', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Gadget', price: 19.99, stock: 50 }
      })
      const { data: created } = create.json<{ data: { id: string } }>()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${created.id}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { price: 24.99 }
      })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for DELETE /api/v1/products/:id', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Doohickey', price: 4.99, stock: 10 }
      })
      const { data: created } = create.json<{ data: { id: string } }>()

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/products/${created.id}`,
        headers: { authorization: `Bearer ${userToken}` }
      })
      expect(res.statusCode).toBe(403)
    })
  })
})
