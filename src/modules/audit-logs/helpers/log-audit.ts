import type { Db } from '@/db/index.js'
import type { NewAuditLogRow } from '@/db/schema/index.js'
import { auditLogs } from '@/db/schema/index.js'

// ponytail: fire-and-forget — logging must never break the request path
export function logAudit(db: Db, data: NewAuditLogRow): void {
  db.insert(auditLogs).values(data).catch(() => {})
}
