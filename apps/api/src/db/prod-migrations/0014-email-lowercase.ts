import process from 'node:process'
import { fileURLToPath } from 'node:url'

import postgres from 'postgres'

// Production-only, non-transactional counterpart to migrations/0014_deep_skin.sql.
//
// Why this exists: `nub run db:migrate` runs every statement in a migration file
// inside one transaction (drizzle-orm's postgres-js migrator wraps the whole file
// in `sql.begin(...)`), and Postgres refuses `CREATE/DROP INDEX CONCURRENTLY`
// inside a transaction block at all. On an empty or small `users` table (dev,
// test, CI, a fresh prod install) the plain transactional migration is fine —
// the lock is instant. Once `users` holds real production rows, run *this*
// script instead of letting drizzle-kit apply 0014, so the backfill and index
// swap never hold a long write lock on `users`.
//
// Usage (production, before or in place of the 0014 step in `nub run db:migrate`):
//   DATABASE_URL=... nubx tsx src/db/prod-migrations/0014-email-lowercase.ts
//
// After this script succeeds, mark 0014 as applied so `drizzle-kit migrate`
// doesn't try to re-run the blocking version:
//   INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
//   VALUES ('<hash from migrations/meta/_journal.json for 0014>', <epoch_ms>);

const BATCH_SIZE = 5_000

async function run() {
  const url = process.env.DATABASE_URL
  if (!url)
    throw new Error('DATABASE_URL is not set')

  // No `max: 1` transaction wrapper — every statement below runs as its own
  // implicit auto-commit statement, which is what makes CONCURRENTLY legal.
  const sql = postgres(url, { max: 1 })

  try {
    const [{ count: collisions }] = await sql<{ count: string }[]>`
      SELECT count(*) FROM (
        SELECT 1 FROM users
        WHERE deleted_at IS NULL
        GROUP BY lower(email)
        HAVING count(*) > 1
      ) dupes
    `
    if (Number(collisions) > 0)
      throw new Error('aborted: active rows collide on lower(email); resolve duplicates manually before re-running')

    // Batch the backfill so no single statement holds a long-running lock or
    // blows up WAL in one shot. Each iteration auto-commits independently.
    let updated: number
    do {
      const rows = await sql`
        UPDATE users
        SET email = lower(email)
        WHERE id IN (
          SELECT id FROM users
          WHERE email <> lower(email)
          LIMIT ${BATCH_SIZE}
        )
      `
      updated = rows.count
      process.stderr.write(`backfilled ${updated} row(s)\n`)
    } while (updated > 0)

    // Build the new unique index without blocking writers, then swap it in
    // with a near-instant metadata-only rename — `users` is never left
    // without a unique constraint on email.
    //
    // Drop any leftover from a prior crashed run first: CONCURRENTLY can abort
    // partway through and leave an INVALID index behind, and IF NOT EXISTS on
    // the CREATE below would then skip rebuilding it, promoting a non-enforcing
    // index via rename and silently losing the unique constraint on email.
    await sql`DROP INDEX CONCURRENTLY IF EXISTS users_email_unique_new`
    await sql`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_unique_new
      ON users (lower(email)) WHERE deleted_at IS NULL
    `
    await sql`ALTER INDEX users_email_unique RENAME TO users_email_unique_old`
    await sql`ALTER INDEX users_email_unique_new RENAME TO users_email_unique`
    await sql`DROP INDEX CONCURRENTLY IF EXISTS users_email_unique_old`

    process.stderr.write('0014-email-lowercase complete\n')
  }
  finally {
    await sql.end()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    process.stderr.write(`0014-email-lowercase failed: ${err.message}\n`)
    process.exit(1)
  })
}
