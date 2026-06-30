import type { FastifyInstance } from 'fastify'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { auditLogs } from '@/db/schema/index.js'
import { createTestApp, eventually, resetDb } from '@/tests/fixtures/index.js'

describe('trusted proxy handling', () => {
  let app: FastifyInstance
  let originalCwd: string
  let originalTrustProxy: string | undefined
  let tempDir: string

  beforeAll(async () => {
    originalCwd = process.cwd()
    originalTrustProxy = process.env.TRUST_PROXY
    delete process.env.TRUST_PROXY
    tempDir = mkdtempSync(join(tmpdir(), 'fastify-api-proxy-'))
    writeFileSync(join(tempDir, '.env'), 'TRUST_PROXY=127.0.0.1 # local reverse proxy\n')
    process.chdir(tempDir)
    app = await createTestApp()
  })

  beforeEach(async () => {
    await resetDb(app)
  })

  afterAll(async () => {
    await app.close()
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
    if (originalTrustProxy === undefined)
      delete process.env.TRUST_PROXY
    else
      process.env.TRUST_PROXY = originalTrustProxy
  })

  it('uses TRUST_PROXY from .env for request.ip', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'proxy@example.com', password: 'Password123' },
    })

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'x-forwarded-for': '203.0.113.7' },
      payload: { email: 'proxy@example.com', password: 'Password123' },
    })

    const log = await eventually(
      async () => {
        const [row] = await app.db
          .select({ metadata: auditLogs.metadata })
          .from(auditLogs)
          .where(eq(auditLogs.action, 'auth.logged_in'))
          .limit(1)
        return row
      },
      row => row !== undefined,
    )

    expect(log.metadata).toMatchObject({ ip: '203.0.113.7' })
  })
})
