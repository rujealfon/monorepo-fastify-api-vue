import type { Db } from '@/db/index.js'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createDb } from '@/db/index.js'
import { permissions, rolePermissions, roles } from '@/db/schema/index.js'

const SEED_ROLES = [
  { name: 'super-admin', description: 'Full system access', isSystemRole: true },
  { name: 'admin', description: 'Administrative access', isSystemRole: false },
  { name: 'user', description: 'Standard user access', isSystemRole: false },
]

export const SEED_PERMISSIONS = [
  { resource: 'user', action: 'create', scope: 'any' },
  { resource: 'user', action: 'read', scope: 'any' },
  { resource: 'user', action: 'update', scope: 'any' },
  { resource: 'user', action: 'delete', scope: 'any' },
  { resource: 'user', action: 'read', scope: 'own' },
  { resource: 'user', action: 'update', scope: 'own' },
  { resource: 'role', action: 'create', scope: 'any' },
  { resource: 'role', action: 'read', scope: 'any' },
  { resource: 'role', action: 'update', scope: 'any' },
  { resource: 'role', action: 'delete', scope: 'any' },
  { resource: 'permission', action: 'create', scope: 'any' },
  { resource: 'permission', action: 'read', scope: 'any' },
  { resource: 'permission', action: 'update', scope: 'any' },
  { resource: 'permission', action: 'delete', scope: 'any' },
  { resource: 'product', action: 'read', scope: 'any' },
  { resource: 'product', action: 'create', scope: 'any' },
  { resource: 'product', action: 'update', scope: 'any' },
  { resource: 'product', action: 'delete', scope: 'any' },
  { resource: 'audit-log', action: 'read', scope: 'any' },
  { resource: 'metrics', action: 'read', scope: 'any' },
  { resource: 'health', action: 'read', scope: 'details' },
]

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super-admin': SEED_PERMISSIONS.map(p => `${p.resource}:${p.action}:${p.scope}`),
  'admin': [
    'health:read:details',
    'user:create:any',
    'user:read:any',
    'user:update:any',
    'user:delete:any',
    'user:read:own',
    'user:update:own',
    'role:read:any',
    'permission:read:any',
    'product:read:any',
    'product:create:any',
    'product:update:any',
    'product:delete:any',
    'audit-log:read:any',
  ],
  'user': ['user:read:own', 'user:update:own', 'product:read:any'],
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
