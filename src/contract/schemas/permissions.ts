import type { RouteMap } from '@/contract/types.js'
import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema, apiListSchema } from '@/common/schemas/index.js'
import { permissionSchema } from '@/modules/permissions/schemas/index.js'

export const permissionsSchema = {
  list: {
    method: 'GET' as const,
    path: '/api/v1/permissions',
    tags: ['Permissions'],
    permission: PERMISSIONS.PERMISSION.READ_ANY,
    responses: {
      200: apiListSchema(permissionSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
