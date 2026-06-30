import type { FastifyPluginAsync } from 'fastify'
import { fastifyRequestContext } from '@fastify/request-context'
import fp from 'fastify-plugin'

declare module '@fastify/request-context' {
  interface RequestContextData {
    userId?: string
    permissions?: string[]
    isSuperAdmin?: boolean
    requestId?: string
  }
}

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyRequestContext)
}

export default fp(requestContextPlugin, { name: 'request-context' })
