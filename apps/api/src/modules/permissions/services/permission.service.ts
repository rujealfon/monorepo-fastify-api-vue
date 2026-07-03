import { asc, count } from 'drizzle-orm'

import type { Db } from '@/db/index.js'

import { permissions } from '@/db/schema/index.js'

export async function findAllPermissions(db: Db, page: number, limit: number) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action), asc(permissions.scope), asc(permissions.id))
      .offset((page - 1) * limit)
      .limit(limit),
    db.select({ total: count() }).from(permissions)
  ])
  return {
    data: rows.map(p => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      scope: p.scope,
      description: p.description,
      createdAt: p.createdAt.toISOString()
    })),
    total
  }
}
