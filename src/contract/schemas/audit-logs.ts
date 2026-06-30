import type { RouteMap } from '@/contract/types.js'
import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema, apiListSchema, paginationQuerySchema, uuidParamSchema } from '@/common/schemas/index.js'
import { auditLogSchema } from '@/modules/audit-logs/schemas/index.js'

export const auditLogsSchema = {
  list: {
    method: 'GET' as const,
    path: '/api/v1/audit-logs',
    tags: ['Audit Logs'],
    permission: PERMISSIONS.AUDIT_LOG.READ_ANY,
    query: paginationQuerySchema,
    responses: {
      200: apiListSchema(auditLogSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  listForUser: {
    method: 'GET' as const,
    path: '/api/v1/users/:id/audit-logs',
    tags: ['Audit Logs'],
    auth: true,
    params: uuidParamSchema,
    query: paginationQuerySchema,
    responses: {
      200: apiListSchema(auditLogSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
