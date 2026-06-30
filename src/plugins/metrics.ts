import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { collectDefaultMetrics, Registry } from 'prom-client'
import { PERMISSIONS } from '@/common/constants/index.js'

declare module 'fastify' {
  interface FastifyInstance {
    metricsRegistry: Registry
  }
}

const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  const registry = new Registry()
  registry.setDefaultLabels({ app: 'fastify-api' })
  collectDefaultMetrics({ register: registry, prefix: 'api_' })

  fastify.decorate('metricsRegistry', registry)

  fastify.get('/metrics', {
    schema: { hide: true },
    preValidation: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.METRICS.READ_ANY)],
    handler: async (_request, reply) => {
      reply.header('Content-Type', registry.contentType)
      return registry.metrics()
    },
  })
}

export default fp(metricsPlugin, { name: 'metrics' })
