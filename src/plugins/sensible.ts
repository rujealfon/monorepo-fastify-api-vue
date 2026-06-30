import type { FastifyPluginAsync } from 'fastify'
import sensible from '@fastify/sensible'
import fp from 'fastify-plugin'

const sensiblePlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sensible)
}

export default fp(sensiblePlugin, { name: 'sensible' })
