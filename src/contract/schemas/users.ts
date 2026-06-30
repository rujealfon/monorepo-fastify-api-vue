import type { RouteMap } from '@/contract/types.js'
import { z } from 'zod'
import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema, apiListSchema, apiSuccessSchema, paginationQuerySchema, uuidParamSchema } from '@/common/schemas/index.js'
import {
  createUserBodySchema,
  updateUserBodySchema,
  userSchema,
} from '@/modules/users/schemas/index.js'

const userRoleParamsSchema = z.object({
  id: z.uuid(),
  roleId: z.uuid(),
})

export const usersSchema = {
  list: {
    method: 'GET' as const,
    path: '/api/v1/users',
    tags: ['Users'],
    permission: PERMISSIONS.USER.READ_ANY,
    query: paginationQuerySchema,
    responses: {
      200: apiListSchema(userSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  get: {
    method: 'GET' as const,
    path: '/api/v1/users/:id',
    tags: ['Users'],
    auth: true,
    params: uuidParamSchema,
    responses: {
      200: apiSuccessSchema(userSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/v1/users',
    tags: ['Users'],
    permission: PERMISSIONS.USER.CREATE_ANY,
    body: createUserBodySchema,
    responses: {
      201: apiSuccessSchema(userSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      409: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  update: {
    method: 'PATCH' as const,
    path: '/api/v1/users/:id',
    tags: ['Users'],
    auth: true,
    params: uuidParamSchema,
    body: updateUserBodySchema,
    responses: {
      200: apiSuccessSchema(userSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      409: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  delete: {
    method: 'DELETE' as const,
    path: '/api/v1/users/:id',
    tags: ['Users'],
    auth: true,
    params: uuidParamSchema,
    responses: {
      204: z.null(),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  assignRole: {
    method: 'POST' as const,
    path: '/api/v1/users/:id/roles/:roleId',
    tags: ['Users'],
    permission: PERMISSIONS.ROLE.UPDATE_ANY,
    params: userRoleParamsSchema,
    responses: {
      200: apiSuccessSchema(z.null()),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  removeRole: {
    method: 'DELETE' as const,
    path: '/api/v1/users/:id/roles/:roleId',
    tags: ['Users'],
    permission: PERMISSIONS.ROLE.UPDATE_ANY,
    params: userRoleParamsSchema,
    responses: {
      200: apiSuccessSchema(z.null()),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
