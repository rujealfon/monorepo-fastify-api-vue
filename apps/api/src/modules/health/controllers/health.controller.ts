import type { FastifyReply, FastifyRequest } from 'fastify'

import { performance } from 'node:perf_hooks'
import process from 'node:process'

import { checkDb } from '@/modules/health/services/health.service.js'

type PressureMetrics = {
  heapUsed: number
  rssBytes: number
  eventLoopDelay: number
  eventLoopUtilized: number
}

type PressureDecorators = {
  memoryUsage?: () => PressureMetrics
  isUnderPressure?: () => boolean
}

export async function liveness(_request: FastifyRequest, _reply: FastifyReply) {
  return { success: true as const, data: { status: 'ok' } }
}

export async function readiness(request: FastifyRequest, reply: FastifyReply) {
  const dbOk = await checkDb(request.server.db)
  // ponytail: Valkey is disabled for now; add checkValkey(request.server.valkey) back when re-enabled.

  if (!dbOk) {
    return reply.status(503).send({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'database unreachable'
      }
    })
  }

  return { success: true as const, data: { status: 'ready' } }
}

export async function details(request: FastifyRequest, _reply: FastifyReply) {
  const pressure = request.server as FastifyRequest['server'] & PressureDecorators
  const processMemory = process.memoryUsage()
  const memory = pressure.memoryUsage?.() ?? {
    heapUsed: processMemory.heapUsed,
    rssBytes: processMemory.rss,
    eventLoopDelay: 0,
    eventLoopUtilized: performance.eventLoopUtilization().utilization
  }
  const underPressure = pressure.isUnderPressure?.() ?? false

  return {
    success: true as const,
    data: {
      status: underPressure ? 'degraded' : 'ok',
      memory: {
        heapUsed: memory.heapUsed,
        rssBytes: memory.rssBytes,
        eventLoopDelay: memory.eventLoopDelay,
        eventLoopUtilized: memory.eventLoopUtilized
      },
      underPressure
    }
  }
}
