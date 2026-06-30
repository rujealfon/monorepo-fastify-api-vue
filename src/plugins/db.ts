import type { FastifyPluginAsync } from 'fastify'
import type { Db } from '@/db/index.js'
import fp from 'fastify-plugin'
import { createDb } from '@/db/index.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const env = fastify.config
  const url = env.NODE_ENV === 'test' ? (env.TEST_DATABASE_URL || env.DATABASE_URL) : env.DATABASE_URL
  const { db, sql } = createDb(url)
  fastify.decorate('db', db)
  fastify.addHook('onClose', async () => {
    await sql.end()
  })
}

export default fp(dbPlugin, { name: 'db' })
