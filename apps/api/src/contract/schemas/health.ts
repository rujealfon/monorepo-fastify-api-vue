import { z } from 'zod'

import { apiErrorSchema, apiSuccessSchema } from '@/common/schemas/index.js'

import type { RouteMap } from '../types.js'

export const healthSchema = {
  live: {
    method: 'GET' as const,
    path: '/api/v1/health/live',
    tags: ['Health'],
    responses: {
      200: apiSuccessSchema(z.object({ status: z.string() })),
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
