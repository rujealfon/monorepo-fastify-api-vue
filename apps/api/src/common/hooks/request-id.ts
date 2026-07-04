import type { FastifyPluginAsync } from 'fastify'

import fp from 'fastify-plugin'

// request.id is already the trusted id (see genReqId in app.ts); this hook
// just echoes it back to the client and exposes it to request-scoped context.
const requestIdHook: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)
    request.requestContext.set('requestId', request.id)
  })
}

export default fp(requestIdHook, { name: 'request-id' })
