import type { GlideClientConfiguration } from '@valkey/valkey-glide'
import type { FastifyPluginAsync } from 'fastify'
import { GlideClient } from '@valkey/valkey-glide'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    valkey: GlideClient
  }
}

function createValkeyConfig(url: string): GlideClientConfiguration {
  const parsedUrl = new URL(url)
  const databaseId = Number.parseInt(parsedUrl.pathname.replace('/', ''), 10)

  return {
    addresses: [{
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
    }],
    databaseId: Number.isNaN(databaseId) ? undefined : databaseId,
    useTLS: parsedUrl.protocol === 'rediss:',
    credentials: parsedUrl.password
      ? {
          username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : 'default',
          password: decodeURIComponent(parsedUrl.password),
        }
      : undefined,
    requestTimeout: 5000,
  }
}

const valkeyPlugin: FastifyPluginAsync = async (fastify) => {
  const valkey = await GlideClient.createClient(createValkeyConfig(fastify.config.VALKEY_URL))

  fastify.decorate('valkey', valkey)

  fastify.addHook('onClose', async () => {
    valkey.close()
  })
}

export default fp(valkeyPlugin, { name: 'valkey' })
