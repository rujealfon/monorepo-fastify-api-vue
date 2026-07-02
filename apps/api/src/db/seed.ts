import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { Db } from '@/db/index.js'

import { PERMISSIONS, ROLES } from '@/common/constants/index.js'
import { createDb } from '@/db/index.js'
import { permissions, rolePermissions, roles } from '@/db/schema/index.js'

const SEED_ROLES = [
  { name: ROLES.SUPER_ADMIN, description: 'Full system access', isSystemRole: true },
  { name: ROLES.ADMIN, description: 'Administrative access', isSystemRole: false },
  { name: ROLES.USER, description: 'Standard user access', isSystemRole: false },
]

function parsePermission(value: string) {
  const [resource, action, scope] = value.split(':')
  if (!resource || !action || !scope)
    throw new Error(`Invalid permission constant: ${value}`)
  return { resource, action, scope }
}

// Adding an entry here only affects fresh databases — existing databases need
// migrations/0010_add_assign_role_permission.sql (or an equivalent re-run of
// `nub run db:seed`) to pick up newly seeded permissions/grants.
export const SEED_PERMISSIONS = [
  PERMISSIONS.USER.CREATE_ANY,
  PERMISSIONS.USER.READ_ANY,
  PERMISSIONS.USER.UPDATE_ANY,
  PERMISSIONS.USER.DELETE_ANY,
  PERMISSIONS.USER.READ_OWN,
  PERMISSIONS.USER.UPDATE_OWN,
  PERMISSIONS.USER.ASSIGN_ROLE_ANY,
  PERMISSIONS.ROLE.CREATE_ANY,
  PERMISSIONS.ROLE.READ_ANY,
  PERMISSIONS.ROLE.UPDATE_ANY,
  PERMISSIONS.ROLE.DELETE_ANY,
  PERMISSIONS.PERMISSION.CREATE_ANY,
  PERMISSIONS.PERMISSION.READ_ANY,
  PERMISSIONS.PERMISSION.UPDATE_ANY,
  PERMISSIONS.PERMISSION.DELETE_ANY,
  PERMISSIONS.PRODUCT.READ_ANY,
  PERMISSIONS.PRODUCT.CREATE_ANY,
  PERMISSIONS.PRODUCT.UPDATE_ANY,
  PERMISSIONS.PRODUCT.DELETE_ANY,
  PERMISSIONS.AUDIT_LOG.READ_ANY,
  PERMISSIONS.METRICS.READ_ANY,
  PERMISSIONS.HEALTH.READ_DETAILS,
].map(parsePermission)

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: SEED_PERMISSIONS.map(p => `${p.resource}:${p.action}:${p.scope}`),
  [ROLES.ADMIN]: [
    PERMISSIONS.HEALTH.READ_DETAILS,
    PERMISSIONS.USER.CREATE_ANY,
    PERMISSIONS.USER.READ_ANY,
    PERMISSIONS.USER.UPDATE_ANY,
    PERMISSIONS.USER.DELETE_ANY,
    PERMISSIONS.USER.READ_OWN,
    PERMISSIONS.USER.UPDATE_OWN,
    PERMISSIONS.ROLE.READ_ANY,
    PERMISSIONS.PERMISSION.READ_ANY,
    PERMISSIONS.PRODUCT.READ_ANY,
    PERMISSIONS.PRODUCT.CREATE_ANY,
    PERMISSIONS.PRODUCT.UPDATE_ANY,
    PERMISSIONS.PRODUCT.DELETE_ANY,
    PERMISSIONS.AUDIT_LOG.READ_ANY,
  ],
  [ROLES.USER]: [PERMISSIONS.USER.READ_OWN, PERMISSIONS.USER.UPDATE_OWN, PERMISSIONS.PRODUCT.READ_ANY],
}

export async function seedRoles(db: Db) {
  await db.insert(roles).values(SEED_ROLES).onConflictDoNothing()
  const allRoles = await db.select({ id: roles.id, name: roles.name }).from(roles)
  const roleMap = Object.fromEntries(allRoles.map(r => [r.name, r.id]))

  await db.insert(permissions).values(SEED_PERMISSIONS).onConflictDoNothing()
  const allPerms = await db.select({ id: permissions.id, resource: permissions.resource, action: permissions.action, scope: permissions.scope }).from(permissions)
  const permMap = Object.fromEntries(allPerms.map(p => [`${p.resource}:${p.action}:${p.scope}`, p.id]))

  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleName]
    if (!roleId)
      continue
    const rows = permKeys.map(key => ({ roleId, permissionId: permMap[key] })).filter(r => r.permissionId)
    if (rows.length)
      await db.insert(rolePermissions).values(rows).onConflictDoNothing()
  }
}

// Standalone runner — only executes when this file is the entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const run = async () => {
    const url = process.env.DATABASE_URL
    if (!url)
      throw new Error('DATABASE_URL is not set')
    const { db, sql } = createDb(url)
    await seedRoles(db)
    await sql.end()
    process.stderr.write('Seed complete\n')
  }
  run().catch((err) => {
    process.stderr.write(`Seed failed: ${err.message}\n`)
    process.exit(1)
  })
}
