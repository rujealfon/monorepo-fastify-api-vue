import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import scalarPlugin from '@/plugins/scalar.js'

describe('scalar plugin', () => {
  it('does not expose Scalar or OpenAPI in production', async () => {
    const app = Fastify()
    app.decorate('config', {
      NODE_ENV: 'production',
      PORT: 3000
    })

    await app.register(scalarPlugin)
    await app.ready()

    const docs = await app.inject({ method: 'GET', url: '/' })
    const spec = await app.inject({ method: 'GET', url: '/openapi.json' })

    expect(docs.statusCode).toBe(404)
    expect(spec.statusCode).toBe(404)
    expect('swagger' in app).toBe(false)

    await app.close()
  })
})
