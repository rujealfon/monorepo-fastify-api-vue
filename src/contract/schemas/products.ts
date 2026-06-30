import type { RouteMap } from '@/contract/types.js'
import { z } from 'zod'
import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema, apiListSchema, apiSuccessSchema, paginationQuerySchema, uuidParamSchema } from '@/common/schemas/index.js'
import {
  createProductBodySchema,
  productSchema,
  updateProductBodySchema,
} from '@/modules/products/schemas/index.js'

export const productsSchema = {
  list: {
    method: 'GET' as const,
    path: '/api/v1/products',
    tags: ['Products'],
    permission: PERMISSIONS.PRODUCT.READ_ANY,
    query: paginationQuerySchema,
    responses: {
      200: apiListSchema(productSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  get: {
    method: 'GET' as const,
    path: '/api/v1/products/:id',
    tags: ['Products'],
    permission: PERMISSIONS.PRODUCT.READ_ANY,
    params: uuidParamSchema,
    responses: {
      200: apiSuccessSchema(productSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/v1/products',
    tags: ['Products'],
    permission: PERMISSIONS.PRODUCT.CREATE_ANY,
    body: createProductBodySchema,
    responses: {
      201: apiSuccessSchema(productSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  update: {
    method: 'PATCH' as const,
    path: '/api/v1/products/:id',
    tags: ['Products'],
    permission: PERMISSIONS.PRODUCT.UPDATE_ANY,
    params: uuidParamSchema,
    body: updateProductBodySchema,
    responses: {
      200: apiSuccessSchema(productSchema),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
  delete: {
    method: 'DELETE' as const,
    path: '/api/v1/products/:id',
    tags: ['Products'],
    permission: PERMISSIONS.PRODUCT.DELETE_ANY,
    params: uuidParamSchema,
    responses: {
      204: z.null(),
      401: apiErrorSchema,
      403: apiErrorSchema,
      404: apiErrorSchema,
      429: apiErrorSchema,
    },
  },
} satisfies RouteMap
