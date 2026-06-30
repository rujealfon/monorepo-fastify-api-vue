import type { FastifyPluginAsync } from 'fastify'
import openapi from '@fastify/swagger'
import scalar from '@scalar/fastify-api-reference'
import fp from 'fastify-plugin'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

const scalarPlugin: FastifyPluginAsync = async (fastify) => {
  // Don't expose the API surface (spec + docs UI) publicly in production.
  if (fastify.config.NODE_ENV === 'production')
    return

  await fastify.register(openapi, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Fastify API',
        description: 'API documentation',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${fastify.config.PORT}`,
          description: 'Development',
        },
      ],
      tags: [
        { name: 'Audit Logs', description: 'Audit log management endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Permissions', description: 'Permission management endpoints' },
        { name: 'Products', description: 'Product management endpoints' },
        { name: 'Profile', description: 'Authenticated user self-management endpoints' },
        { name: 'Roles', description: 'Role management endpoints' },
        { name: 'Users', description: 'User management endpoints' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  })

  await fastify.register(scalar, {
    routePrefix: '/',
    configuration: {
      spec: { content: () => fastify.swagger() },
      theme: 'moon',
    },
  })
}

export default fp(scalarPlugin, { name: 'scalar' })
