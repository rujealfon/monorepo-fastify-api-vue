import type { Db } from '@/db/index.js'
import { asc } from 'drizzle-orm'
import { permissions } from '@/db/schema/index.js'

export async function findAllPermissions(db: Db) {
  const rows = await db
    .select()
    .from(permissions)
    .orderBy(asc(permissions.resource), asc(permissions.action))
  return rows.map(p => ({
    id: p.id,
    resource: p.resource,
    action: p.action,
    scope: p.scope,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  }))
}
