import { createApiClient } from '@monorepo-fastify-api-vue/api-client'

export const api = createApiClient(import.meta.env.VITE_API_URL ?? '')
