import type { FastifyPluginAsync } from 'fastify'
import underPressure from '@fastify/under-pressure'
import fp from 'fastify-plugin'

const underPressurePlugin: FastifyPluginAsync = async (fastify) => {
  // Dev/test run under watch and integration containers where these thresholds
  // are routinely exceeded; keep auto-503 protection for production only.
  if (fastify.config.NODE_ENV !== 'production')
    return

  await fastify.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 200 * 1024 * 1024,
    maxRssBytes: 300 * 1024 * 1024,
    maxEventLoopUtilization: 0.98,
    message: 'Server is under pressure',
    retryAfter: 50,
    exposeStatusRoute: false,
  })
}

export default fp(underPressurePlugin, { name: 'under-pressure' })
