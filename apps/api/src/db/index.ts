import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index.js'

export function createDb(url: string, searchPath?: string, max = 10) {
  const sql = postgres(url, {
    max,
    idle_timeout: 30,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    ...(searchPath ? { connection: { search_path: searchPath } } : {})
  })
  const db = drizzle(sql, { schema })
  return { db, sql }
}

export type Db = ReturnType<typeof createDb>['db']

/** The transaction-scoped client passed into `db.transaction(async (tx) => ...)`. */
export type Tx = Parameters<Db['transaction']>[0] extends (tx: infer T) => unknown ? T : never
