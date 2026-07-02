import type { FastifyPluginAsync } from 'fastify'

import fp from 'fastify-plugin'
import process from 'node:process'

import { testSchemaName } from '@/common/test-db-schema.js'
import { createDb } from '@/db/index.js'

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const env = fastify.config
  const url = env.NODE_ENV === 'test' ? (env.TEST_DATABASE_URL || env.DATABASE_URL) : env.DATABASE_URL
  const searchPath = env.NODE_ENV === 'test' ? testSchemaName(process.env.VITEST_POOL_ID) : undefined
  const { db, sql } = createDb(url, searchPath)
  fastify.decorate('db', db)
  fastify.addHook('onClose', async () => {
    await sql.end()
  })
}

export default fp(dbPlugin, { name: 'db' })
