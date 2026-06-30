/* eslint-disable antfu/no-top-level-await */
/* eslint-disable node/prefer-global/process */
/* eslint-disable no-console */

import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const { rowCount } = await client.query(
  `DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '90 days'`,
)

console.log(`[cleanup] purged ${rowCount} user(s) soft-deleted >90 days ago`)
await client.end()
