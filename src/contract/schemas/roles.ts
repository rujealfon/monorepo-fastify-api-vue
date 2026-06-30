import type { RouteMap } from '@/contract/types.js'
import { z } from 'zod'
import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema, apiListSchema, apiSuccessSchema, uuidParamSchema } from '@/common/schemas/index.js'
import { createRoleBodySchema, roleSchema, updateRoleBodySchema } from '@/modules/roles/schemas/index.js'

const rolePermParamsSchema = z.object({
  id: z.uuid(),
  permId: z.uuid(),
})

export const rolesSchema = {
  list: {
    method: 'GET' as const,
    path: '/api/v1/roles',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.READ_ANY,
    responses: {
      200: apiListSchema(roleSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  get: {
    method: 'GET' as const,
    path: '/api/v1/roles/:id',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.READ_ANY,
    params: uuidParamSchema,
    responses: {
      200: apiSuccessSchema(roleSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/v1/roles',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.CREATE_ANY,
    body: createRoleBodySchema,
    responses: {
      201: apiSuccessSchema(roleSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      409: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  update: {
    method: 'PATCH' as const,
    path: '/api/v1/roles/:id',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.UPDATE_ANY,
    params: uuidParamSchema,
    body: updateRoleBodySchema,
    responses: {
      200: apiSuccessSchema(roleSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      409: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  delete: {
    method: 'DELETE' as const,
    path: '/api/v1/roles/:id',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.DELETE_ANY,
    params: uuidParamSchema,
    responses: {
      204: z.null(),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  assignPermission: {
    method: 'POST' as const,
    path: '/api/v1/roles/:id/permissions/:permId',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.UPDATE_ANY,
    params: rolePermParamsSchema,
    responses: {
      200: apiSuccessSchema(z.null()),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  removePermission: {
    method: 'DELETE' as const,
    path: '/api/v1/roles/:id/permissions/:permId',
    tags: ['Roles'],
    permission: PERMISSIONS.ROLE.UPDATE_ANY,
    params: rolePermParamsSchema,
    responses: {
      200: apiSuccessSchema(z.null()),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
