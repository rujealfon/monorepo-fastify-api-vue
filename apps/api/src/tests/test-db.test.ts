import type { FastifyInstance } from 'fastify'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { testSchemaName } from '@/common/test-db-schema.js'
import { hashPassword } from '@/common/user-records.js'
import { createTestApp } from '@/tests/fixtures/index.js'

describe('test database setup', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('uses the current Vitest worker schema', async () => {
    const rows = await app.db.execute<{ schema: string }>(sql`select current_schema() as schema`)
    expect(rows[0]?.schema).toBe(testSchemaName(process.env.VITEST_POOL_ID))
  })

  it('uses a low bcrypt cost in tests', async () => {
    await expect(hashPassword('Password123')).resolves.toMatch(/^\$2[aby]\$04\$/)
  })
})
