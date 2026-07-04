import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  // Keep local development and integration tests unthrottled. Any reachable
  // deployment (staging, preview, prod, or an unset/typo'd NODE_ENV) must
  // fail closed into rate-limited rather than silently unthrottled.
  if (fastify.config.NODE_ENV === 'development' || fastify.config.NODE_ENV === 'test')
    return

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '15 minutes',
    // ponytail: in-memory store is fine for one instance; restore Valkey store before horizontal scaling.
    allowList: (request: FastifyRequest) => {
      const path = request.url.split('?', 1)[0]?.replace(/\/$/, '')
      return path === '/api/v1/health/live' || path === '/api/v1/health/ready'
    },
    keyGenerator: (request: FastifyRequest) => request.ip
  })
}

export default fp(rateLimitPlugin, { name: 'rate-limit' })
