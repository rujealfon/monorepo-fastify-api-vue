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

`createDb` uses `postgres` (postgres.js) with `max: 10` connections. The pool is created once and shared via `fastify.db` (decorated by `plugins/db.ts`).

## Migrations

Migrations live in `../../migrations/` and are committed to version control.

```bash
# After editing a schema file, generate a new migration:
nub db:generate

# Apply migrations inside the running Docker container:
nub db:migrate
```

## Adding a new table

1. Create `src/db/schema/<table>.ts` following the existing pattern (use `uuidv7()` for PKs, include `createdAt` / `updatedAt` / `deletedAt`).
2. Export it from `src/db/schema/index.ts`.
3. Run `nub db:generate` to create the migration.
4. The table is immediately available in all services via `fastify.db`.

## Soft deletes

All tables include a `deletedAt` column. DELETE routes set `deletedAt = now()` rather than removing the row. Queries must filter `where(isNull(table.deletedAt))` to exclude soft-deleted records.

## Type

The `Db` type exported from `index.ts` is used as a parameter type in services, keeping them decoupled from Fastify:

```ts
import type { Db } from '@/db/index.js'

export async function findAll(db: Db) { ... }
```
