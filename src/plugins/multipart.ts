import type { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import fp from 'fastify-plugin'

const multipartPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 10,
      fields: 50,
      fieldSize: 1 * 1024 * 1024,
    },
  })
}

export default fp(multipartPlugin, { name: 'multipart' })
