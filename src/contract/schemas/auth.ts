import type { RouteMap } from '@/contract/types.js'
import { z } from 'zod'
import { apiErrorSchema, apiSuccessSchema } from '@/common/schemas/index.js'
import {
  authUserSchema,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
} from '@/modules/auth/schemas/index.js'

export const authSchema = {
  register: {
    method: 'POST' as const,
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    rateLimit: { max: 5, timeWindow: '15 minutes' },
    body: registerBodySchema,
    responses: {
      201: apiSuccessSchema(authUserSchema),
      400: apiErrorSchema,
      429: apiErrorSchema,
      409: apiErrorSchema,
    },
  },
  login: {
    method: 'POST' as const,
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    rateLimit: { max: 5, timeWindow: '15 minutes' },
    body: loginBodySchema,
    responses: {
      200: apiSuccessSchema(authUserSchema),
      401: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  mobileLogin: {
    method: 'POST' as const,
    path: '/api/v1/auth/mobile/login',
    tags: ['Auth'],
    rateLimit: { max: 5, timeWindow: '15 minutes' },
    body: loginBodySchema,
    responses: {
      200: apiSuccessSchema(loginResponseSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  logout: {
    method: 'POST' as const,
    path: '/api/v1/auth/logout',
    tags: ['Auth'],
    optionalAuth: true,
    responses: {
      200: apiSuccessSchema(z.null()),
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
