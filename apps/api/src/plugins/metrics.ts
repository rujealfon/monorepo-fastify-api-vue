import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import fp from 'fastify-plugin'
import { collectDefaultMetrics, Registry } from 'prom-client'
import { z } from 'zod'

import { PERMISSIONS } from '@/common/constants/index.js'
import { apiErrorSchema } from '@/common/schemas/index.js'

const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  const registry = new Registry()
  registry.setDefaultLabels({ app: 'fastify-api' })
  collectDefaultMetrics({ register: registry, prefix: 'api_' })

  fastify.decorate('metricsRegistry', registry)

  fastify.get('/api/v1/metrics', {
    schema: {
      tags: ['Metrics'],
      summary: 'Prometheus metrics',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      response: {
        200: z.string(),
        401: apiErrorSchema,
        403: apiErrorSchema,
        429: apiErrorSchema
      }
    },
    preValidation: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.METRICS.READ_ANY)],
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Content-Type', registry.contentType)
      return registry.metrics()
    }
  })
}

export default fp(metricsPlugin, { name: 'metrics' })
