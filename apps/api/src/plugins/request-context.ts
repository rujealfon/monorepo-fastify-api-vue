import type { FastifyPluginAsync } from 'fastify'

import { fastifyRequestContext } from '@fastify/request-context'
import fp from 'fastify-plugin'

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyRequestContext)
}

export default fp(requestContextPlugin, { name: 'request-context' })
