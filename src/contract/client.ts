import type { z } from 'zod'
import type { RouteMap } from './types.js'
import { auditLogsSchema } from './schemas/audit-logs.js'
import { authSchema } from './schemas/auth.js'
import { permissionsSchema } from './schemas/permissions.js'
import { productsSchema } from './schemas/products.js'
import { profileSchema } from './schemas/profile.js'
import { rolesSchema } from './schemas/roles.js'
import { usersSchema } from './schemas/users.js'

// ---- Type helpers ----

type SuccessStatus = 200 | 201 | 202 | 204

type SuccessBody<T extends { responses: Record<number, z.ZodType> }> = {
  [S in Extract<keyof T['responses'], SuccessStatus>]: S extends 204
    ? undefined
    : z.infer<T['responses'][S]>
}[Extract<keyof T['responses'], SuccessStatus>]

type MaybeQuery<T> = T extends { query: z.ZodType }
  ? { query?: Partial<z.infer<T['query']>> }
  : Record<never, never>

type MaybeParams<T> = T extends { params: z.ZodType }
  ? { params: z.infer<T['params']> }
  : Record<never, never>

type MaybeBody<T> = T extends { body: z.ZodType }
  ? { body: z.infer<T['body']> }
  : Record<never, never>

type ClientInput<T> = MaybeQuery<T> & MaybeParams<T> & MaybeBody<T> & { headers?: Record<string, string> }

type ClientCaller<T extends { responses: Record<number, z.ZodType> }>
  = Record<never, never> extends Omit<ClientInput<T>, 'headers'>
    ? (input?: ClientInput<T>) => Promise<SuccessBody<T>>
    : (input: ClientInput<T>) => Promise<SuccessBody<T>>

type NsClient<T extends RouteMap> = {
  [K in keyof T]: ClientCaller<T[K]>
}

// ---- Error ----

export class RpcError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(`RPC Error ${status}`)
  }
}

// ---- Client builder ----

function buildNsClient<T extends RouteMap>(
  schema: T,
  baseUrl: string,
  getToken?: () => string,
): NsClient<T> {
  const client: Record<string, unknown> = {}

  for (const [name, route] of Object.entries(schema)) {
    client[name] = async (input?: {
      query?: Record<string, unknown>
      params?: Record<string, string>
      body?: unknown
      headers?: Record<string, string>
    }) => {
      let path = baseUrl.replace(/\/$/, '') + route.path

      if (input?.params) {
        for (const [key, value] of Object.entries(input.params)) {
          path = path.replace(`:${key}`, encodeURIComponent(value))
        }
      }

      const url = new URL(path)
      if (input?.query) {
        for (const [key, value] of Object.entries(input.query)) {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value))
          }
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...input?.headers,
      }
      if (getToken && (route.auth || route.optionalAuth)) {
        const token = getToken()
        if (token)
          headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(url.toString(), {
        method: route.method,
        headers,
        body: input?.body !== undefined ? JSON.stringify(input.body) : undefined,
      })

      if (res.status === 204)
        return undefined
      const data = await res.json()
      if (!res.ok)
        throw new RpcError(res.status, data)
      return data
    }
  }

  return client as NsClient<T>
}

// ---- Public API ----

export function createApiClient(
  baseUrl: string,
  options?: { getToken?: () => string },
) {
  return {
    auditLogs: buildNsClient(auditLogsSchema, baseUrl, options?.getToken),
    auth: buildNsClient(authSchema, baseUrl, options?.getToken),
    permissions: buildNsClient(permissionsSchema, baseUrl, options?.getToken),
    products: buildNsClient(productsSchema, baseUrl, options?.getToken),
    profile: buildNsClient(profileSchema, baseUrl, options?.getToken),
    roles: buildNsClient(rolesSchema, baseUrl, options?.getToken),
    users: buildNsClient(usersSchema, baseUrl, options?.getToken),
  }
}
