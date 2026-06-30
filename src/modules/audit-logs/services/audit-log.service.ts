import type { Db } from '@/db/index.js'
import { desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { auditLogs } from '@/db/schema/index.js'

export async function findAuditLogs(db: Db, page: number, limit: number, userId?: string) {
  const where = userId ? eq(auditLogs.userId, userId) : undefined
  const rows = await db
    .select({ ...getTableColumns(auditLogs), total: sql<number>`count(*) over()` })
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)
  const total = Number(rows[0]?.total ?? 0)
  return {
    data: rows.map(({ total: _, ...r }) => ({
      ...r,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  }
}
