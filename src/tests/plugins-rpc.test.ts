import openapi from '@fastify/swagger'
import Fastify from 'fastify'
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

async function buildDocumentationApp() {
  const app = Fastify()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorate('authenticate', async () => {})
  app.decorate('optionalAuthenticate', async () => {})
  app.decorate('requirePermission', () => async () => {})

  await app.register(openapi, {
    openapi: {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })

  await app.register(createFastifyRpcPlugin({
    optionalLogout: {
      method: 'POST',
      path: '/logout',
      optionalAuth: true,
      responses: { 200: z.object({ ok: z.boolean() }) },
    },
    requiredProfile: {
      method: 'GET',
      path: '/profile',
      auth: true,
      responses: { 200: z.object({ ok: z.boolean() }) },
    },
  }, {
    optionalLogout: async () => ({ status: 200, body: { ok: true } }),
    requiredProfile: async () => ({ status: 200, body: { ok: true } }),
  }))

  await app.ready()
  return app
}

describe('rpc plugin OpenAPI security', () => {
  it('documents optional-auth routes as allowing anonymous requests', async () => {
    const app = await buildDocumentationApp()
    try {
      const spec = app.swagger() as {
        paths: Record<string, Record<string, { security?: unknown }>>
      }

      expect(spec.paths['/logout']?.post?.security).toEqual([
        {},
        { cookieAuth: [] },
        { bearerAuth: [] },
      ])
      expect(spec.paths['/profile']?.get?.security).toEqual([
        { cookieAuth: [] },
        { bearerAuth: [] },
      ])
    }
    finally {
      await app.close()
    }
  })
})
