import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import type { RouteMap } from '@/contract/types.js'

interface HandlerInput<T extends { query?: z.ZodType, params?: z.ZodType, body?: z.ZodType }> {
  query: T['query'] extends z.ZodType ? z.infer<T['query']> : undefined
  params: T['params'] extends z.ZodType ? z.infer<T['params']> : undefined
  body: T['body'] extends z.ZodType ? z.infer<T['body']> : undefined
  request: FastifyRequest
  reply: FastifyReply
}

type HandlerReturn<T extends { responses: Record<number, z.ZodType> }> = {
  [S in Extract<keyof T['responses'], number>]: {
    status: S
    body: z.infer<T['responses'][S]>
  }
}[Extract<keyof T['responses'], number>]

export type RouteHandlers<T extends RouteMap> = {
  [K in keyof T]: (input: HandlerInput<T[K]>) => Promise<HandlerReturn<T[K]>>
}

export function createFastifyRpcPlugin<T extends RouteMap>(
  schema: T,
  handlers: RouteHandlers<T>,
): FastifyPluginAsync {
  return async (fastify) => {
    for (const [name, route] of Object.entries(schema)) {
      const handler = (handlers as Record<string, (input: unknown) => Promise<{ status: number, body: unknown }>>)[name]
      if (!handler)
        continue

      const preValidation = []
      if (route.auth || route.permission)
        preValidation.push(fastify.authenticate)
      else if (route.optionalAuth)
        preValidation.push(fastify.optionalAuthenticate)
      if (route.permission)
        preValidation.push(fastify.requirePermission(route.permission))

      fastify.route({
        method: route.method as any,
        url: route.path,
        ...(route.rateLimit !== undefined && { config: { rateLimit: route.rateLimit } }),
        schema: {
          ...(route.tags !== undefined && { tags: route.tags }),
          ...((route.auth || route.permission) && { security: [{ cookieAuth: [] }, { bearerAuth: [] }] }),
          ...(route.optionalAuth && !(route.auth || route.permission) && { security: [{}, { cookieAuth: [] }, { bearerAuth: [] }] }),
          ...(route.query !== undefined && { querystring: route.query }),
          ...(route.params !== undefined && { params: route.params }),
          ...(route.body !== undefined && { body: route.body }),
          response: route.responses,
        } as any,
        preValidation: preValidation.length ? preValidation : undefined,
        handler: async (request, reply) => {
          const result = await handler({
            query: request.query,
            params: request.params,
            body: request.body,
            request,
            reply,
          })
          if (result.status === 204)
            return reply.status(204).send()
          return reply.status(result.status).send(result.body)
        },
      })
    }
  }
}
