import type { GlideClient } from '@valkey/valkey-glide'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Registry } from 'prom-client'

import type { AppConfig } from '@/config/schema.js'
import type { Db } from '@/db/index.js'

import '@fastify/swagger'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    config: AppConfig
    db: Db
    metricsRegistry: Registry
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requirePermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    swagger: (opts?: { yaml?: boolean }) => Record<string, unknown> | string
    valkey: GlideClient
  }

  interface FastifySchema {
    hide?: boolean
  }
}
