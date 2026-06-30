import type { FastifyRateLimitOptions, FastifyRateLimitStore } from '@fastify/rate-limit'
import type { Span } from '@opentelemetry/api'
import type { GlideClient, GlideReturnType } from '@valkey/valkey-glide'
import type { RouteOptions } from 'fastify'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { Script } from '@valkey/valkey-glide'

const tracer = trace.getTracer('fastify-api.rate-limit-store')

const rateLimitScript = new Script(`
  local key = KEYS[1]
  local timeWindow = tonumber(ARGV[1])
  local max = tonumber(ARGV[2])
  local continueExceeding = ARGV[3] == 'true'
  local exponentialBackoff = ARGV[4] == 'true'
  local maxSafeInteger = (2^53) - 1

  local current = redis.call('INCR', key)

  if current == 1 or (continueExceeding and current > max) then
    redis.call('PEXPIRE', key, timeWindow)
  elseif exponentialBackoff and current > max then
    local backoffExponent = current - max - 1
    timeWindow = math.min(timeWindow * (2 ^ backoffExponent), maxSafeInteger)
    redis.call('PEXPIRE', key, timeWindow)
  else
    timeWindow = redis.call('PTTL', key)
  end

  return {current, timeWindow}
`)

type StoreCallback = (
  error: Error | null,
  result?: { current: number, ttl: number },
) => void

type RateLimitRouteOptions = RouteOptions & {
  routeInfo?: {
    method: string
    url: string
  }
}

type RateLimitStoreConstructor = new (
  options: FastifyRateLimitOptions & {
    continueExceeding?: boolean
    exponentialBackoff?: boolean
  }
) => FastifyRateLimitStore

function toNumber(value: GlideReturnType | undefined): number {
  if (typeof value === 'number')
    return value
  if (typeof value === 'bigint')
    return Number(value)
  if (typeof value === 'string')
    return Number.parseInt(value, 10)
  return 0
}

export function createValkeyRateLimitStore(valkey: GlideClient): RateLimitStoreConstructor {
  return class ValkeyRateLimitStore implements FastifyRateLimitStore {
    private readonly continueExceeding: boolean
    private readonly exponentialBackoff: boolean
    private readonly keyPrefix: string

    constructor(options: FastifyRateLimitOptions & {
      continueExceeding?: boolean
      exponentialBackoff?: boolean
    }, keyPrefix = 'fastify-rate-limit-') {
      this.continueExceeding = options.continueExceeding ?? false
      this.exponentialBackoff = options.exponentialBackoff ?? false
      this.keyPrefix = keyPrefix
    }

    incr(key: string, callback: StoreCallback, timeWindow: number, max: number): void {
      void this.increment(key, timeWindow, max)
        .then(result => callback(null, result))
        .catch(error => callback(error instanceof Error ? error : new Error(String(error))))
    }

    child(routeOptions: RateLimitRouteOptions): FastifyRateLimitStore {
      const method = routeOptions.routeInfo?.method ?? routeOptions.method
      const url = routeOptions.routeInfo?.url ?? routeOptions.url
      return new ValkeyRateLimitStore(
        {
          continueExceeding: this.continueExceeding,
          exponentialBackoff: this.exponentialBackoff,
        },
        `${this.keyPrefix}${method}${url}-`,
      )
    }

    private async increment(key: string, timeWindow: number, max: number) {
      return tracer.startActiveSpan('valkey.rate_limit.increment', async (span: Span) => {
        span.setAttributes({
          'db.system.name': 'valkey',
          'db.operation.name': 'invokeScript',
          'db.collection.name': 'rate-limit',
          'rate_limit.time_window_ms': timeWindow,
          'rate_limit.max': max,
          'rate_limit.continue_exceeding': this.continueExceeding,
          'rate_limit.exponential_backoff': this.exponentialBackoff,
        })

        try {
          const result = await valkey.invokeScript(rateLimitScript, {
            keys: [`${this.keyPrefix}${key}`],
            args: [
              String(timeWindow),
              String(max),
              String(this.continueExceeding),
              String(this.exponentialBackoff),
            ],
          })

          if (!Array.isArray(result)) {
            throw new TypeError('Unexpected Valkey rate-limit response')
          }

          return {
            current: toNumber(result[0]),
            ttl: toNumber(result[1]),
          }
        }
        catch (error) {
          span.recordException(error instanceof Error ? error : new Error(String(error)))
          span.setStatus({ code: SpanStatusCode.ERROR })
          throw error
        }
        finally {
          span.end()
        }
      })
    }
  }
}
