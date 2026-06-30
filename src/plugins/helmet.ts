import type { FastifyPluginAsync } from 'fastify'
import helmet from '@fastify/helmet'
import fp from 'fastify-plugin'

const helmetPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    // CSP disabled: the API serves JSON only, no HTML, so a policy would do
    // nothing useful and would break Scalar docs in non-prod environments.
    contentSecurityPolicy: false,
  })
}

export default fp(helmetPlugin, { name: 'helmet' })
