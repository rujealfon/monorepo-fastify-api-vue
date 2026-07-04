import type { GlideClient } from '@valkey/valkey-glide'
import type { FastifyReply as Reply, FastifyRequest as Request } from 'fastify'
import type { Registry } from 'prom-client'

import type { AppConfig } from '@/config/schema.js'
import type { Db } from '@/db/index.js'

import '@fastify/cookie'
import '@fastify/swagger'

interface CookieOptions {
  httpOnly?: boolean
  path?: string
  sameSite?: 'lax' | 'none' | 'strict' | boolean
  secure?: boolean | 'auto'
  signed?: boolean
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: Request, reply: Reply) => Promise<void>
    config: AppConfig
    db: Db
    metricsRegistry: Registry
    optionalAuthenticate: (request: Request, reply: Reply) => Promise<void>
    requirePermission: (permission: string) => (request: Request, reply: Reply) => Promise<void>
    swagger: (opts?: { yaml?: boolean }) => Record<string, unknown> | string
    // ponytail: Valkey is disabled at startup, but dormant plugin files still compile against this decorator.
    valkey: GlideClient
  }

  interface FastifyReply {
    clearCookie: (name: string, options?: CookieOptions) => FastifyReply
    jwtSign: (payload: string | object) => Promise<string>
    setCookie: (name: string, value: string, options?: CookieOptions) => FastifyReply
  }

  interface FastifyRequest {
    cookies: { [cookieName: string]: string | undefined }
    jwtVerify: () => Promise<unknown>
    user: unknown
  }

  interface FastifySchema {
    hide?: boolean
  }
}
