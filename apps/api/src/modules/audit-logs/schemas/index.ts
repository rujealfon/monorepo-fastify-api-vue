import { z } from 'zod'

export const auditLogSchema = z.object({
  id: z.uuid(),
  userId: z.uuid().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
})

export type AuditLog = z.infer<typeof auditLogSchema>
