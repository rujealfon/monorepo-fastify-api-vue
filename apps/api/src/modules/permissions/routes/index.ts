import { permissionsSchema } from '@/contract/schemas/permissions.js'
import { findAllPermissions } from '@/modules/permissions/services/permission.service.js'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

export default createFastifyRpcPlugin(permissionsSchema, {
  list: async ({ query, request }) => {
    const { data, total } = await findAllPermissions(request.server.db, query.page, query.limit)
    return { status: 200 as const, body: { success: true as const, data, pagination: { page: query.page, limit: query.limit, total } } }
  },
})
