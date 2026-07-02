import { profileSchema } from '@/contract/schemas/profile.js'
import { findUserById } from '@/modules/users/services/user.service.js'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

export default createFastifyRpcPlugin(profileSchema, {
  me: async ({ request }) => {
    const userId = request.requestContext.get('userId') as string
    const user = await findUserById(request.server.db, userId)
    return { status: 200 as const, body: { success: true as const, data: user } }
  },
})
