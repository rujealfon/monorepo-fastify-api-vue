import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const mobileAuthPlugin: FastifyPluginAsync = async (fastify) => {
  if (fastify.config.NODE_ENV === 'production' && !fastify.config.MOBILE_API_KEY)
    throw new Error('MOBILE_API_KEY must be set in production')
}

export default fp(mobileAuthPlugin, { name: 'mobile-auth' })
