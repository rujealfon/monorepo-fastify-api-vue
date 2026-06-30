import { permissionsSchema } from '@/contract/schemas/permissions.js'
import { findAllPermissions } from '@/modules/permissions/services/permission.service.js'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

export default createFastifyRpcPlugin(permissionsSchema, {
  list: async ({ request }) => {
    const data = await findAllPermissions(request.server.db)
    return { status: 200 as const, body: { success: true as const, data, pagination: { page: 1, limit: data.length, total: data.length } } }
  },
})
