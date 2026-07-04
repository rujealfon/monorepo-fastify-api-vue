import type { FastifyBaseLogger } from 'fastify'

import type { Db } from '@/db/index.js'
import type { NewAuditLogRow } from '@/db/schema/index.js'

import { auditLogs } from '@/db/schema/index.js'

// ponytail: fire-and-forget — logging must never break the request path.
// The catch still warns so a failing audit trail (schema drift, disk,
// connection exhaustion) doesn't fail completely silently.
export function logAudit(db: Db, log: FastifyBaseLogger, data: NewAuditLogRow): void {
  db.insert(auditLogs).values(data).catch((err) => {
    log.warn({ err, action: data.action }, 'failed to write audit log')
  })
}
