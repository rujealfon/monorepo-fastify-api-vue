import type { FastifyPluginAsync } from 'fastify'
import cors from '@fastify/cors'
import fp from 'fastify-plugin'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const configuredOrigins = fastify.config.CORS_ORIGIN
    ? fastify.config.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (fastify.config.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    throw new Error('CORS_ORIGIN must be set in production')
  }

  const origin = fastify.config.NODE_ENV === 'production'
    ? configuredOrigins
    : ['http://localhost:3000', 'http://localhost:5173']

  await fastify.register(cors, {
    origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Mobile-Api-Key'],
    credentials: true,
  })
}

export default fp(corsPlugin, { name: 'cors' })
