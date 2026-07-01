import type { FastifyInstance } from 'fastify'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestPermission as Permission, TestRole as Role } from '@/tests/fixtures/index.js'

import { createRole as createRoleFixture, createRoleWithPermission, createTestApp, listPermissions as listPermissionsFixture, listRoles as listRolesFixture, registerAdminAndLogin, registerAndAssignRole, registerAndLogin, registerSuperAdminAndLogin, resetDb } from '@/tests/fixtures/index.js'

describe('roles API', () => {
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

  // ── helpers ────────────────────────────────────────────────────────────────

  const auth = (t: string) => ({ authorization: `Bearer ${t}` })

  function createRole(name: string, description?: string): Promise<Role> {
    return createRoleFixture(app, superAdminToken, name, description)
  }

  function listRoles(): Promise<Role[]> {
    return listRolesFixture(app, adminToken)
  }

  function listPermissions(): Promise<Permission[]> {
    return listPermissionsFixture(app, adminToken)
  }

  // ── GET /api/v1/roles ──────────────────────────────────────────────────────

  describe('gET /api/v1/roles', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/roles' })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for a regular user', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: auth(userToken) })
      expect(res.statusCode).toBe(403)
    })

    it('returns 200 for admin (role:read:any)', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: auth(adminToken) })
      expect(res.statusCode).toBe(200)
    })

    it('returns 200 for super-admin', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: auth(superAdminToken) })
      expect(res.statusCode).toBe(200)
    })

    it('returns the seeded roles with correct shape', async () => {
      const roles = await listRoles()
      expect(Array.isArray(roles)).toBe(true)
      expect(roles.length).toBeGreaterThanOrEqual(3)
      const superAdmin = roles.find(r => r.name === 'super-admin')
      expect(superAdmin).toBeDefined()
      expect(superAdmin!.isSystemRole).toBe(true)
      const admin = roles.find(r => r.name === 'admin')
      expect(admin).toBeDefined()
      expect(admin!.isSystemRole).toBe(false)
      const user = roles.find(r => r.name === 'user')
      expect(user).toBeDefined()
      expect(user!.isSystemRole).toBe(false)
    })

    it('each role has the correct fields', async () => {
      const roles = await listRoles()
      const role = roles[0]
      expect(role).toHaveProperty('id')
      expect(role).toHaveProperty('name')
      expect(role).toHaveProperty('isSystemRole')
      expect(role).toHaveProperty('createdAt')
    })

    it('returns roles sorted alphabetically by name', async () => {
      const roles = await listRoles()
      const names = roles.map(r => r.name)
      expect(names).toEqual([...names].sort())
    })

    it('paginates with ?page and ?limit', async () => {
      await createRole('page-role-1')
      await createRole('page-role-2')
      await createRole('page-role-3')
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/roles?page=1&limit=2',
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(200)
      const body = res.json<{ data: unknown[], pagination: { page: number, limit: number, total: number } }>()
      expect(body.data.length).toBeLessThanOrEqual(2)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(2)
      // 3 seeded roles + 3 created above, DB reset per test via beforeEach
      expect(body.pagination.total).toBe(6)
    })

    it('returns different roles on page 2', async () => {
      await createRole('page-role-a')
      await createRole('page-role-b')
      await createRole('page-role-c')
      const page1 = await app.inject({ method: 'GET', url: '/api/v1/roles?page=1&limit=2', headers: auth(superAdminToken) })
      const page2 = await app.inject({ method: 'GET', url: '/api/v1/roles?page=2&limit=2', headers: auth(superAdminToken) })
      const page1Ids = page1.json<{ data: Array<{ id: string }> }>().data.map(r => r.id)
      const page2Ids = page2.json<{ data: Array<{ id: string }> }>().data.map(r => r.id)
      expect(page2Ids.some(id => page1Ids.includes(id))).toBe(false)
    })
  })

  // ── GET /api/v1/roles/:id ──────────────────────────────────────────────────

  describe('gET /api/v1/roles/:id', () => {
    it('returns 401 without a token', async () => {
      const [role] = await listRoles()
      const res = await app.inject({ method: 'GET', url: `/api/v1/roles/${role.id}` })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for a regular user', async () => {
      const [role] = await listRoles()
      const res = await app.inject({ method: 'GET', url: `/api/v1/roles/${role.id}`, headers: auth(userToken) })
      expect(res.statusCode).toBe(403)
    })

    it('returns the role by id for admin', async () => {
      const roles = await listRoles()
      const target = roles.find(r => r.name === 'admin')!
      const res = await app.inject({ method: 'GET', url: `/api/v1/roles/${target.id}`, headers: auth(adminToken) })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: Role }>()
      expect(data.id).toBe(target.id)
      expect(data.name).toBe('admin')
      expect(data.isSystemRole).toBe(false)
    })

    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/roles/00000000-0000-0000-0000-000000000000',
        headers: auth(adminToken),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for a non-uuid id', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/roles/not-a-uuid', headers: auth(adminToken) })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── POST /api/v1/roles ─────────────────────────────────────────────────────

  describe('pOST /api/v1/roles', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/v1/roles', payload: { name: 'editor' } })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for a regular user', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/v1/roles', headers: auth(userToken), payload: { name: 'editor' } })
      expect(res.statusCode).toBe(403)
    })

    it('returns 403 for admin (missing role:create:any)', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/v1/roles', headers: auth(adminToken), payload: { name: 'editor' } })
      expect(res.statusCode).toBe(403)
    })

    it('creates a role and returns 201 for super-admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: auth(superAdminToken),
        payload: { name: 'editor', description: 'Can edit content' },
      })
      expect(res.statusCode).toBe(201)
      const { data } = res.json<{ data: Role }>()
      expect(data.id).toBeDefined()
      expect(data.name).toBe('editor')
      expect(data.description).toBe('Can edit content')
      expect(data.isSystemRole).toBe(false)
      expect(data.createdAt).toBeDefined()
    })

    it('always creates roles with isSystemRole=false regardless of input', async () => {
      // Security: isSystemRole must not be user-settable
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: auth(superAdminToken),
        payload: { name: 'sneaky', isSystemRole: true },
      })
      // isSystemRole is stripped from the schema, so the field is ignored
      expect(res.statusCode).toBe(201)
      const { data } = res.json<{ data: Role }>()
      expect(data.isSystemRole).toBe(false)
    })

    it('returns 409 for a duplicate role name', async () => {
      await createRole('editor')
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: auth(superAdminToken),
        payload: { name: 'editor' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('returns 400 when name is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: auth(superAdminToken),
        payload: { description: 'No name' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when name is empty string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: auth(superAdminToken),
        payload: { name: '' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── PATCH /api/v1/roles/:id ────────────────────────────────────────────────

  describe('pATCH /api/v1/roles/:id', () => {
    it('returns 401 without a token', async () => {
      const role = await createRole('patchable')
      const res = await app.inject({ method: 'PATCH', url: `/api/v1/roles/${role.id}`, payload: { name: 'updated' } })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for admin (missing role:update:any)', async () => {
      const role = await createRole('patchable')
      const res = await app.inject({ method: 'PATCH', url: `/api/v1/roles/${role.id}`, headers: auth(adminToken), payload: { name: 'updated' } })
      expect(res.statusCode).toBe(403)
    })

    it('updates a role name and description for super-admin', async () => {
      const role = await createRole('old-name', 'old desc')
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/roles/${role.id}`,
        headers: auth(superAdminToken),
        payload: { name: 'new-name', description: 'new desc' },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json<{ data: Role }>()
      expect(data.name).toBe('new-name')
      expect(data.description).toBe('new desc')
    })

    it('can clear description by setting to null', async () => {
      const role = await createRole('has-desc', 'some desc')
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/roles/${role.id}`,
        headers: auth(superAdminToken),
        payload: { description: null },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json<{ data: Role }>().data.description).toBeNull()
    })

    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/roles/00000000-0000-0000-0000-000000000000',
        headers: auth(superAdminToken),
        payload: { name: 'x' },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 409 on duplicate name', async () => {
      await createRole('taken')
      const role = await createRole('free')
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/roles/${role.id}`,
        headers: auth(superAdminToken),
        payload: { name: 'taken' },
      })
      expect(res.statusCode).toBe(409)
    })
  })

  // ── DELETE /api/v1/roles/:id ───────────────────────────────────────────────

  describe('dELETE /api/v1/roles/:id', () => {
    it('returns 401 without a token', async () => {
      const role = await createRole('deletable')
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${role.id}` })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for admin (missing role:delete:any)', async () => {
      const role = await createRole('deletable')
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${role.id}`, headers: auth(adminToken) })
      expect(res.statusCode).toBe(403)
    })

    it('deletes a custom role and returns 204', async () => {
      const role = await createRole('temporary')
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${role.id}`, headers: auth(superAdminToken) })
      expect(res.statusCode).toBe(204)
    })

    it('deleted role no longer appears in the list', async () => {
      const role = await createRole('gone')
      await app.inject({ method: 'DELETE', url: `/api/v1/roles/${role.id}`, headers: auth(superAdminToken) })
      const roles = await listRoles()
      expect(roles.find(r => r.id === role.id)).toBeUndefined()
    })

    it('returns 403 when deleting a system role', async () => {
      const roles = await listRoles()
      const systemRole = roles.find(r => r.isSystemRole)!
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${systemRole.id}`, headers: auth(superAdminToken) })
      expect(res.statusCode).toBe(403)
    })

    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/roles/00000000-0000-0000-0000-000000000000',
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  // ── POST /api/v1/roles/:id/permissions/:permId ─────────────────────────────

  describe('pOST /api/v1/roles/:id/permissions/:permId', () => {
    it('returns 401 without a token', async () => {
      const role = await createRole('r')
      const perms = await listPermissions()
      const res = await app.inject({ method: 'POST', url: `/api/v1/roles/${role.id}/permissions/${perms[0].id}` })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for admin (missing role:update:any)', async () => {
      const role = await createRole('r')
      const perms = await listPermissions()
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/roles/${role.id}/permissions/${perms[0].id}`,
        headers: auth(adminToken),
      })
      expect(res.statusCode).toBe(403)
    })

    it('assigns a permission to a role and returns 200', async () => {
      const role = await createRole('restricted')
      const perms = await listPermissions()
      const perm = perms.find(p => p.resource === 'user' && p.action === 'read' && p.scope === 'any')!
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/roles/${role.id}/permissions/${perm.id}`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(200)
    })

    it('is idempotent — assigning the same permission twice returns 200', async () => {
      const role = await createRole('idempotent')
      const perms = await listPermissions()
      const url = `/api/v1/roles/${role.id}/permissions/${perms[0].id}`
      await app.inject({ method: 'POST', url, headers: auth(superAdminToken) })
      const res = await app.inject({ method: 'POST', url, headers: auth(superAdminToken) })
      expect(res.statusCode).toBe(200)
    })

    it('returns 404 for an unknown role', async () => {
      const perms = await listPermissions()
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/roles/00000000-0000-0000-0000-000000000000/permissions/${perms[0].id}`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 for an unknown permission', async () => {
      const role = await createRole('r')
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/roles/${role.id}/permissions/00000000-0000-0000-0000-000000000000`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 403 when caller holds role:update:any but not the permission being granted', async () => {
      // A "role manager" who can edit role definitions but was never granted user:delete:any.
      const managerRole = await createRoleWithPermission(app, superAdminToken, 'role-manager-2', { resource: 'role', action: 'update', scope: 'any' })
      const { token: managerToken } = await registerAndAssignRole(app, superAdminToken, managerRole.id, { email: 'rolemgr2@example.com', password: 'Password123' })

      const perms = await listPermissions()
      const deleteAnyPerm = perms.find(p => p.resource === 'user' && p.action === 'delete' && p.scope === 'any')!
      const target = await createRole('escalation-target')
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/roles/${target.id}/permissions/${deleteAnyPerm.id}`,
        headers: auth(managerToken),
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ── DELETE /api/v1/roles/:id/permissions/:permId ───────────────────────────

  describe('dELETE /api/v1/roles/:id/permissions/:permId', () => {
    it('returns 401 without a token', async () => {
      const role = await createRole('r')
      const perms = await listPermissions()
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${role.id}/permissions/${perms[0].id}` })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for admin (missing role:update:any)', async () => {
      const role = await createRole('r')
      const perms = await listPermissions()
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/roles/${role.id}/permissions/${perms[0].id}`,
        headers: auth(adminToken),
      })
      expect(res.statusCode).toBe(403)
    })

    it('removes a permission from a role and returns 200', async () => {
      const role = await createRole('withperm')
      const perms = await listPermissions()
      const perm = perms[0]
      await app.inject({ method: 'POST', url: `/api/v1/roles/${role.id}/permissions/${perm.id}`, headers: auth(superAdminToken) })
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/roles/${role.id}/permissions/${perm.id}`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(200)
    })

    it('is idempotent — removing a non-existent association returns 200', async () => {
      const role = await createRole('noperm')
      const perms = await listPermissions()
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/roles/${role.id}/permissions/${perms[0].id}`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(200)
    })

    it('returns 404 for an unknown role', async () => {
      const perms = await listPermissions()
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/roles/00000000-0000-0000-0000-000000000000/permissions/${perms[0].id}`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 for an unknown permission', async () => {
      const role = await createRole('unknown-perm')
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/roles/${role.id}/permissions/00000000-0000-0000-0000-000000000000`,
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for non-uuid params', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/roles/not-a-uuid/permissions/not-a-uuid',
        headers: auth(superAdminToken),
      })
      expect(res.statusCode).toBe(400)
    })
  })
})
