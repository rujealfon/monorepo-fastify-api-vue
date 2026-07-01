import type { FastifyPluginAsync } from 'fastify'

import helmet from '@fastify/helmet'
import fp from 'fastify-plugin'

const helmetPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    // CSP disabled only outside production: Scalar docs UI needs inline
    // scripts/styles there. Production mounts no HTML routes and Scalar is
    // not registered, so CSP stays on as defense in depth.
    contentSecurityPolicy: fastify.config.NODE_ENV === 'production' ? undefined : false,
  })
}

export default fp(helmetPlugin, { name: 'helmet' })
