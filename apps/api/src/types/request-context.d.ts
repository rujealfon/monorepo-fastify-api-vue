import '@fastify/request-context'

declare module '@fastify/request-context' {
  interface RequestContextData {
    isSuperAdmin?: boolean
    permissions?: string[]
    requestId?: string
    userId?: string
  }
}
