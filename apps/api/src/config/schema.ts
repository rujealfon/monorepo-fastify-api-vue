export type AppConfig = {
  PORT: number
  HOST: string
  NODE_ENV: 'development' | 'production' | 'test'
  DATABASE_URL: string
  TEST_DATABASE_URL?: string
  JWT_SECRET: string
  LOG_LEVEL: string
  VALKEY_URL: string
  COOKIE_SECRET: string
  OTEL_ENDPOINT: string
  MOBILE_API_KEY: string
  CORS_ORIGIN: string
  TRUST_PROXY: string
  DB_POOL_MAX: number
}

export const configSchema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET', 'VALKEY_URL', 'MOBILE_API_KEY'],
  properties: {
    PORT: { type: 'integer', default: 3000 },
    HOST: { type: 'string', default: '0.0.0.0' },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      default: 'development'
    },
    DATABASE_URL: { type: 'string' },
    TEST_DATABASE_URL: { type: 'string', default: '' },
    JWT_SECRET: { type: 'string', minLength: 32 },
    LOG_LEVEL: { type: 'string', default: 'info' },
    VALKEY_URL: { type: 'string' },
    COOKIE_SECRET: { type: 'string', default: '', anyOf: [{ maxLength: 0 }, { minLength: 32 }] },
    OTEL_ENDPOINT: { type: 'string', default: '' },
    MOBILE_API_KEY: { type: 'string', minLength: 32 },
    CORS_ORIGIN: { type: 'string', default: '' },
    TRUST_PROXY: { type: 'string', default: '' },
    DB_POOL_MAX: { type: 'integer', default: 10 }
  }
} as const
