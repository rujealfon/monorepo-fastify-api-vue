import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'node:crypto'
import fp from 'fastify-plugin'

const REQUEST_ID_PATTERN = /^[\w\-]{1,64}$/

const requestIdHook: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const raw = request.headers['x-request-id'] as string | undefined
    const id = raw && REQUEST_ID_PATTERN.test(raw) ? raw : randomUUID()
    reply.header('x-request-id', id)
    request.requestContext.set('requestId', id)
  })
}

export default fp(requestIdHook, { name: 'request-id' })
