import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema, apiSuccessSchema } from '@/common/schemas/index.js'
import * as controller from '@/modules/health/controllers/health.controller.js'

const healthRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/live', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness probe',
      response: {
        200: apiSuccessSchema(z.object({ status: z.string() })),
      },
    },
    handler: controller.liveness,
  })

  fastify.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe (checks DB + Valkey connectivity)',
      response: {
        200: apiSuccessSchema(z.object({ status: z.string() })),
        503: apiErrorSchema,
      },
    },
    handler: controller.readiness,
  })

  fastify.get('/details', {
    schema: {
      tags: ['Health'],
      summary: 'System details — memory, event loop, pressure status',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      response: {
        200: apiSuccessSchema(z.object({
          status: z.string(),
          memory: z.object({
            heapUsed: z.number(),
            rssBytes: z.number(),
            eventLoopDelay: z.number(),
            eventLoopUtilized: z.number(),
          }),
          underPressure: z.boolean(),
        })),
        401: apiErrorSchema,
        403: apiErrorSchema,
        429: apiErrorSchema,
      },
    },
    preValidation: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.HEALTH.READ_DETAILS)],
    handler: controller.details,
  })
}

export default healthRoutes
