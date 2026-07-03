import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index.js'

export function createDb(url: string, searchPath?: string) {
  const sql = postgres(url, {
    max: 10,
    ...(searchPath ? { connection: { search_path: searchPath } } : {})
  })
  const db = drizzle(sql, { schema })
  return { db, sql }
}

export type Db = ReturnType<typeof createDb>['db']

/** The transaction-scoped client passed into `db.transaction(async (tx) => ...)`. */
export type Tx = Parameters<Db['transaction']>[0] extends (tx: infer T) => unknown ? T : never
