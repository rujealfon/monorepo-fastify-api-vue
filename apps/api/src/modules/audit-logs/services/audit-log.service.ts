import { count, desc, eq, getTableColumns } from 'drizzle-orm'

import type { Db } from '@/db/index.js'

import { resolvePage } from '@/common/pagination.js'
import { auditLogs } from '@/db/schema/index.js'

export async function findAuditLogs(db: Db, page: number, limit: number, userId?: string) {
  const where = userId ? eq(auditLogs.userId, userId) : undefined
  const { rows, total } = await resolvePage(
    db
      .select(getTableColumns(auditLogs))
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),
    db.select({ total: count() }).from(auditLogs).where(where),
  )
  return {
    data: rows.map(r => ({
      ...r,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  }
}
