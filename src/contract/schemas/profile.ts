import type { RouteMap } from '@/contract/types.js'
import { apiErrorSchema, apiSuccessSchema } from '@/common/schemas/index.js'
import { userSchema } from '@/modules/users/schemas/index.js'

export const profileSchema = {
  me: {
    method: 'GET' as const,
    path: '/api/v1/profile',
    tags: ['Profile'],
    auth: true,
    responses: {
      200: apiSuccessSchema(userSchema),
      401: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
