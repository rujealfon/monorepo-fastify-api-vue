import type { FastifyPluginAsync } from 'fastify'
import cookie from '@fastify/cookie'
import fp from 'fastify-plugin'

const cookiePlugin: FastifyPluginAsync = async (fastify) => {
  if (fastify.config.NODE_ENV === 'production' && !fastify.config.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET must be set in production to isolate cookie signing from JWT signing')
  }

  await fastify.register(cookie, {
    secret: fastify.config.COOKIE_SECRET || fastify.config.JWT_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: fastify.config.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  })
}

export default fp(cookiePlugin, { name: 'cookie' })
