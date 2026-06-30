import type { FastifyPluginAsync } from 'fastify'
import compress from '@fastify/compress'
import fp from 'fastify-plugin'

const compressPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(compress, {
    global: true,
    encodings: ['br', 'gzip', 'deflate'],
    threshold: 1024,
  })
}

export default fp(compressPlugin, { name: 'compress' })
