import type { FastifyRequest } from 'fastify'
import { PERMISSIONS } from '@/common/constants/index.js'
import { ForbiddenError } from '@/common/errors/AppError.js'
import { usersSchema } from '@/contract/schemas/users.js'
import { logAudit } from '@/modules/audit-logs/helpers/log-audit.js'
import * as userService from '@/modules/users/services/user.service.js'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

// Allow if actor has the :any permission OR is modifying their own account
function assertSelfOrAdmin(request: FastifyRequest, targetId: string, anyPerm: string) {
  const isSuperAdmin = request.requestContext.get('isSuperAdmin') ?? false
  const perms = request.requestContext.get('permissions') ?? []
  const actorId = request.requestContext.get('userId')
  // ponytail: own-scope check — :any goes through requirePermission at route level
  if (!isSuperAdmin && !perms.includes(anyPerm) && actorId !== targetId)
    throw new ForbiddenError('You can only modify your own account')
}

export default createFastifyRpcPlugin(usersSchema, {
  list: async ({ query, request }) => {
    const { page, limit } = query
    const { data, total } = await userService.findAllUsers(request.server.db, page, limit)
    return { status: 200 as const, body: { success: true as const, data, pagination: { page, limit, total } } }
  },

  get: async ({ params, request }) => {
    assertSelfOrAdmin(request, params.id, PERMISSIONS.USER.READ_ANY)
    const user = await userService.findUserById(request.server.db, params.id)
    return { status: 200 as const, body: { success: true as const, data: user } }
  },

  create: async ({ body, request }) => {
    const user = await userService.createUser(request.server.db, body)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'user.created', resourceType: 'user', resourceId: user.id })
    return { status: 201 as const, body: { success: true as const, data: user } }
  },

  update: async ({ params, body, request }) => {
    assertSelfOrAdmin(request, params.id, PERMISSIONS.USER.UPDATE_ANY)
    const user = await userService.updateUser(request.server.db, params.id, body)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'user.updated', resourceType: 'user', resourceId: params.id, metadata: { changedFields: Object.keys(body) } })
    return { status: 200 as const, body: { success: true as const, data: user } }
  },

  delete: async ({ params, request }) => {
    assertSelfOrAdmin(request, params.id, PERMISSIONS.USER.DELETE_ANY)
    const actorId = request.requestContext.get('userId')
    await userService.deleteUser(request.server.db, params.id, actorId)
    logAudit(request.server.db, { userId: actorId, action: 'user.deleted', resourceType: 'user', resourceId: params.id })
    return { status: 204 as const, body: null }
  },

  assignRole: async ({ params, request }) => {
    const isSuperAdmin = request.requestContext.get('isSuperAdmin') ?? false
    await userService.assignRoleToUser(request.server.db, params.id, params.roleId, isSuperAdmin)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'role.assigned', resourceType: 'user', resourceId: params.id, metadata: { roleId: params.roleId } })
    return { status: 200 as const, body: { success: true as const, data: null } }
  },

  removeRole: async ({ params, request }) => {
    const isSuperAdmin = request.requestContext.get('isSuperAdmin') ?? false
    await userService.removeRoleFromUser(request.server.db, params.id, params.roleId, isSuperAdmin)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'role.removed', resourceType: 'user', resourceId: params.id, metadata: { roleId: params.roleId } })
    return { status: 200 as const, body: { success: true as const, data: null } }
  },
})
