# src/db/

Database layer — Drizzle ORM client and table schema definitions.

## Files

| File | Purpose |
|---|---|
| `index.ts` | `createDb(url)` factory — returns a typed `db` instance and the raw `postgres` connection |
| `schema/index.ts` | Re-exports all table definitions (imported by Drizzle and the DB plugin) |
| `schema/users.ts` | `users` table |
| `schema/products.ts` | `products` table |

## Connection pool

`createDb` uses `postgres` (postgres.js) with `idle_timeout: 30`, `connect_timeout: 10`, `max_lifetime: 1800`, and `max` connections (default 10, override via `DB_POOL_MAX`). The pool is created once and shared via `fastify.db` (decorated by `plugins/db.ts`).

## Migrations

Migrations live in `../../migrations/` and are committed to version control.

```bash
# After editing a schema file, generate a new migration:
nub run db:generate

# Apply migrations inside the running Docker container:
nub run db:migrate
```

### Production-sensitive migrations (`prod-migrations/`)

`nub run db:migrate` (drizzle-kit) runs every statement in a migration file inside a single transaction. Postgres refuses `CREATE`/`DROP INDEX CONCURRENTLY` inside a transaction block at all, and a plain `UPDATE` that rewrites a large table holds its row locks for the whole statement. On an empty or small table this is fine — the lock is instant — which is all dev/test/CI ever see.

Once a migration needs to change an index or bulk-rewrite a table that already holds production data, don't let `drizzle-kit migrate` apply it. Instead:

1. Write a standalone script in `src/db/prod-migrations/<same-number>-<name>.ts` that opens its own `postgres()` connection (no `sql.begin`, so every statement auto-commits) and does the equivalent change with `CREATE/DROP INDEX CONCURRENTLY` and/or a batched backfill loop (chunk + commit, don't rewrite the whole table in one statement).
2. Add a comment at the top of the corresponding `migrations/NNNN_*.sql` file pointing at the script, so the plain version stays correct for dev/test/CI but production knows to use the script instead.
3. Run the script manually against production, then insert its migration's hash into `drizzle.__drizzle_migrations` (hash comes from `migrations/meta/_journal.json`) so `drizzle-kit migrate` treats it as already applied and doesn't try to replay the blocking version.

See `prod-migrations/0014-email-lowercase.ts` for a worked example (concurrent unique-index rebuild + build-new/rename swap instead of drop-then-create, plus a chunked backfill for the `lower(email)` normalization).

## Adding a new table

1. Create `src/db/schema/<table>.ts` following the existing pattern (use `uuidv7()` for PKs, include `createdAt` / `updatedAt` / `deletedAt`).
2. Export it from `src/db/schema/index.ts`.
3. Run `nub run db:generate` to create the migration.
4. The table is immediately available in all services via `fastify.db`.

## Soft deletes

All tables include a `deletedAt` column. DELETE routes set `deletedAt = now()` rather than removing the row. Queries must filter `where(isNull(table.deletedAt))` to exclude soft-deleted records.

## Type

The `Db` type exported from `index.ts` is used as a parameter type in services, keeping them decoupled from Fastify:

```ts
import type { Db } from '@/db/index.js'

export async function findAll(db: Db) { ... }
```
