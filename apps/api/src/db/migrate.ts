import process from 'node:process'

import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { createDb } from './index.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl)
  throw new Error('DATABASE_URL is required to run migrations')

const { db, sql } = createDb(databaseUrl)

try {
  await migrate(db, { migrationsFolder: './migrations' })
}
finally {
  await sql.end()
}
