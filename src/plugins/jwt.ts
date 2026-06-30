import type { FastifyPluginAsync } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fp from 'fastify-plugin'

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    sign: { expiresIn: '24h' },
    cookie: { cookieName: 'token', signed: false },
  })
}

export default fp(jwtPlugin, { name: 'jwt' })
