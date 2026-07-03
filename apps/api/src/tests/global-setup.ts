import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import postgres from 'postgres'

import { testSchemaName } from '@/common/test-db-schema.js'

import { TEST_WORKER_COUNT } from './worker-count.js'

export default async function setup() {
  const envFile = resolve(process.cwd(), '.env.test')
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile)
  }

  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url)
    throw new Error('TEST_DATABASE_URL (or DATABASE_URL) is not set')

  const sql = postgres(url, { max: 1 })
  const migrationsDir = resolve(import.meta.dirname, '../../migrations')
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  try {
    for (let poolId = 1; poolId <= TEST_WORKER_COUNT; poolId++) {
      const schema = testSchemaName(String(poolId))
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await sql.unsafe(`CREATE SCHEMA "${schema}"`)
      for (const file of files) {
        // drizzle-kit hardcodes `"public"."table"` in FK references. Strip
        // that qualifier so FKs resolve against this worker's schema (via
        // search_path) instead of pinning back to the real `public` schema.
        const statements = readFileSync(resolve(migrationsDir, file), 'utf8').replaceAll('"public".', '')
        await sql.unsafe(`SET search_path TO "${schema}"; ${statements}`)
      }
    }
  }
  finally {
    await sql.end()
  }
}
