import { PERMISSIONS } from '@/common/constants/index.js'
import { ForbiddenError } from '@/common/errors/AppError.js'
import { auditLogsSchema } from '@/contract/schemas/audit-logs.js'
import { findAuditLogs } from '@/modules/audit-logs/services/audit-log.service.js'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

export default createFastifyRpcPlugin(auditLogsSchema, {
  list: async ({ query, request }) => {
    const { page, limit } = query
    const { data, total } = await findAuditLogs(request.server.db, page, limit)
    return { status: 200 as const, body: { success: true as const, data, pagination: { page, limit, total } } }
  },

  listForUser: async ({ params, query, request }) => {
    const isSuperAdmin = request.requestContext.get('isSuperAdmin') ?? false
    const perms = request.requestContext.get('permissions') ?? []
    const actorId = request.requestContext.get('userId')
    if (!isSuperAdmin && !perms.includes(PERMISSIONS.USER.READ_ANY) && actorId !== params.id)
      throw new ForbiddenError('You can only view your own audit log')

    const { page, limit } = query
    const { data, total } = await findAuditLogs(request.server.db, page, limit, params.id)
    return { status: 200 as const, body: { success: true as const, data, pagination: { page, limit, total } } }
  },
})
