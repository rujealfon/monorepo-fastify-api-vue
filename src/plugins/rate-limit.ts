import type { FastifyPluginAsync } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { createValkeyRateLimitStore } from './rate-limit-store.js'

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  // Keep local development and integration tests unthrottled. Production uses
  // Redis-backed limits so counters are shared across app instances.
  if (fastify.config.NODE_ENV !== 'production')
    return

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '15 minutes',
    store: createValkeyRateLimitStore(fastify.valkey),
    allowList: request => request.url === '/health/live' || request.url === '/health/ready',
    keyGenerator: request => request.ip,
  })
}

export default fp(rateLimitPlugin, { name: 'rate-limit' })
