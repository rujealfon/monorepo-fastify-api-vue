import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import envPlugin from '@fastify/env'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import authDecorator from './common/decorators/auth.js'
import { AppError } from './common/errors/AppError.js'
import requestIdHook from './common/hooks/request-id.js'
import { configSchema } from './config/schema.js'
import auditLogsRoutes from './modules/audit-logs/routes/index.js'
import authRoutes from './modules/auth/routes/index.js'
import healthRoutes from './modules/health/routes/index.js'
import permissionsRoutes from './modules/permissions/routes/index.js'
import productsRoutes from './modules/products/routes/index.js'
import profileRoutes from './modules/profile/routes/index.js'
import rolesRoutes from './modules/roles/routes/index.js'
import usersRoutes from './modules/users/routes/index.js'
import compressPlugin from './plugins/compress.js'
import cookiePlugin from './plugins/cookie.js'
import corsPlugin from './plugins/cors.js'
import dbPlugin from './plugins/db.js'
import helmetPlugin from './plugins/helmet.js'
import jwtPlugin from './plugins/jwt.js'
import metricsPlugin from './plugins/metrics.js'
import mobileAuthPlugin from './plugins/mobile-auth.js'
import multipartPlugin from './plugins/multipart.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import requestContextPlugin from './plugins/request-context.js'
import scalarPlugin from './plugins/scalar.js'
import sensiblePlugin from './plugins/sensible.js'
import underPressurePlugin from './plugins/under-pressure.js'
import valkeyPlugin from './plugins/valkey.js'

function parseTrustProxy(value: string | undefined) {
  if (!value)
    return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true')
    return true
  if (normalized === 'false')
    return undefined
  if (/^\d+$/.test(normalized))
    return Number.parseInt(normalized, 10)
  return value
}

function readDotEnvValue(key: string) {
  if (!existsSync('.env'))
    return undefined
  const prefix = `${key}=`
  const line = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find(line => line.trim().startsWith(prefix))
  const value = line?.trim().slice(prefix.length).trim()
  if (!value)
    return undefined
  const quote = value[0]
  if (quote === '"' || quote === '\'') {
    const end = value.indexOf(quote, 1)
    return end === -1 ? value.slice(1) : value.slice(1, end)
  }
  return value.replace(/\s+#.*$/, '').trim()
}

export async function buildApp() {
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY ?? readDotEnvValue('TRUST_PROXY'))
  const fastify = Fastify({
    ...(trustProxy !== undefined && { trustProxy }),
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>()

  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Config — must be first
  await fastify.register(envPlugin, {
    confKey: 'config',
    schema: configSchema,
    dotenv: true,
  })

  // Data layer
  await fastify.register(dbPlugin)
  await fastify.register(valkeyPlugin)
  await fastify.register(rateLimitPlugin)

  // Security & transport
  await fastify.register(helmetPlugin)
  await fastify.register(corsPlugin)
  await fastify.register(cookiePlugin)

  // Auth
  await fastify.register(jwtPlugin)
  await fastify.register(requestContextPlugin)
  await fastify.register(mobileAuthPlugin)
  await fastify.register(authDecorator)
  await fastify.register(requestIdHook)

  // Core utilities
  await fastify.register(sensiblePlugin)
  await fastify.register(compressPlugin)

  // API docs
  await fastify.register(scalarPlugin)

  // Reliability
  await fastify.register(underPressurePlugin)

  // Request lifecycle
  await fastify.register(multipartPlugin)

  // Observability — registered after auth so fastify.authenticate is available
  await fastify.register(metricsPlugin)

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON())
    }
    const err = error as Error & { code?: string, statusCode?: number, validation?: Array<Record<string, unknown>> }
    if (err.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: err.validation.map((issue) => {
            const path = Array.isArray(issue.path)
              ? (issue.path as (string | number)[])
              : (issue.instancePath as string | undefined ?? '').replace(/^\//, '').split('/').filter(Boolean)
            return {
              path,
              code: (issue.keyword as string | undefined) ?? 'invalid',
              message: (issue.message as string | undefined) ?? 'Invalid value',
            }
          }),
        },
      })
    }
    if (err.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: err.code ?? 'HTTP_ERROR',
          message: err.message,
        },
      })
    }
    request.log.error({ err }, 'unhandled error')
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    })
  })

  // Routes
  await fastify.register(healthRoutes, { prefix: '/health' })
  await fastify.register(authRoutes)
  await fastify.register(profileRoutes)
  await fastify.register(usersRoutes)
  await fastify.register(productsRoutes)
  await fastify.register(rolesRoutes)
  await fastify.register(permissionsRoutes)
  await fastify.register(auditLogsRoutes)

  return fastify
}
