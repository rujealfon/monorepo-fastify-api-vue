import '@fastify/request-context'
import 'fastify'

interface AppRequestContextData {
  isSuperAdmin?: boolean
  permissions?: string[]
  requestId?: string
  userId?: string
}

interface AppRequestContextStore {
  get: <Key extends keyof AppRequestContextData>(key: Key) => AppRequestContextData[Key]
  set: <Key extends keyof AppRequestContextData>(key: Key, value: AppRequestContextData[Key]) => void
}

declare module '@fastify/request-context' {
  interface RequestContextData extends AppRequestContextData {}
}

declare module 'fastify' {
  interface FastifyRequest {
    requestContext: AppRequestContextStore
  }
}
