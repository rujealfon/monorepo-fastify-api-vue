# Review instructions

This is a nub monorepo: `apps/api` (Fastify API), `apps/web` (Vue 3 + Pinia
Colada), `packages/api-client` (typed fetch client), `packages/eslint-config`.
Paths below are relative to the owning workspace unless prefixed.

## What Important means here

Reserve 🔴 Important for findings that would break production behavior, open a
security hole, or corrupt data:

- Logic bugs that return wrong results or silently swallow errors
- Authentication/authorization bypasses (contract route missing `auth: true` or
  `permission`, incorrect `requirePermission`, ownership checks skipped)
- Permission strings hard-coded anywhere outside
  `src/common/constants/index.ts`
- PII or sensitive values logged, serialized to clients, or stored in plaintext
  (passwords, JWTs, cookies, reset tokens, `passwordHash`)
- Soft-delete filter (`deletedAt IS NULL`) missing on queries that should
  respect it
- Missing transaction on multi-write flows
- `timestamp()` columns without `{ withTimezone: true }` (must be TIMESTAMPTZ)
- Backwards-incompatible database migrations applied to live data without a
  compatibility note
- A migration that changes an index or bulk-rewrites a table holding
  production data without a corresponding `src/db/prod-migrations/` script
  (`CREATE/DROP INDEX CONCURRENTLY`, chunked backfill) and a pointer comment
  in the plain `migrations/NNNN_*.sql` file — see `apps/api/src/db/README.md`
- Security header or cookie flag regressions (`httpOnly`, `secure`, `sameSite`,
  CORS origin whitelist, Helmet defaults weakened)
- N+1 queries in request handlers (prefer `inArray` batch fetches)
- Pagination limit missing on unbounded list queries
- A contract `responses` status used in a handler but not declared in the
  schema (breaks `fastify-type-provider-zod` serialization)
- Missing unique-conflict handling where duplicate writes are possible
- Raw library exceptions, SQL errors, or stack traces surfaced to clients
- Web: server data duplicated into a Pinia store instead of living in the
  Colada query cache
- Web: a reactive value used inside a `query` function but missing from its
  `key` (stale cache entries)

Style, naming, missing comments, and test coverage are 🟡 Nit at most.

## Cap the nits

Report at most five 🟡 Nits per review. If you found more, write "plus N
similar items" in the summary rather than posting them inline. If every finding
is a Nit, open the summary with "No blocking issues found."

## Do not report

- Anything ESLint already enforces (formatting, import order, unused
  variables, cross-feature and `../` import bans)
- Generated files: `apps/api/migrations/`, `dist/`, lockfiles
- Drizzle migration snapshots under `migrations/meta/`
- Scripts in `src/db/prod-migrations/` are hand-written, NOT generated —
  review them like any other code
- Test fixtures and seed data that intentionally violate production rules
- OpenTelemetry and Prometheus instrumentation boilerplate — do not flag it as
  dead code or complexity
- Suggestions to add comments or JSDoc; the codebase is intentionally lean on
  comments

## Always check

### Access control
- Every non-public route in `src/contract/schemas/` has `auth: true` or a
  `permission` field; `optionalAuth` is only present when anonymous access is
  intentional and tested.
- RPC access control flows through contract flags → `fastify.authenticate` /
  `fastify.optionalAuthenticate` → `fastify.requirePermission()` in
  `src/plugins/rpc.ts`. Handler-level user checks are only acceptable for
  ownership rules (e.g. "user can only edit their own resource"), and run in
  addition to `authenticate`, not instead of it.
- Dynamic permissions live in the database (roles/permissions tables);
  permission string constants only in `src/common/constants/index.ts`.

### Schema & validation
- Request params, query, body, and every declared response status use a Zod
  schema. Types are derived with `z.infer<>` — no hand-written interfaces.
- Contract schemas in `src/contract/schemas/` import only from `zod`,
  `@/contract/types.js`, `@/common/constants/`, `@/common/schemas/`, and
  `@/modules/<domain>/schemas/`. No Fastify, Drizzle, or server-side imports.
  Module schemas referenced from contracts must themselves be pure Zod
  (browser-safe) — they are re-exported through `packages/api-client`.

### Services
- Service functions contain no Fastify imports (`FastifyRequest`,
  `FastifyReply`, decorators, `request.server`). Dependencies (`db`, `valkey`,
  primitive values) are injected as parameters.
- No import from `src/plugins/` or `src/modules/` inside a service.

### Database
- All new `timestamp` columns use `{ withTimezone: true }` (TIMESTAMPTZ). No
  bare `timestamp()`.
- Multi-write flows use a Drizzle transaction.
- New columns or tables include indexes on foreign keys and columns used in
  common filters.
- Unique-conflict cases are handled explicitly (`.onConflictDoNothing()` or an
  equivalent check).
- IDs generated at the application layer use `uuidv7`.
- Index changes or bulk rewrites against tables with production data follow
  the `prod-migrations/` pattern in `apps/api/src/db/README.md`: standalone
  auto-commit script with `CONCURRENTLY` / chunked backfill, plus a pointer
  comment in the plain migration file.

### Valkey
- Valkey is accessed through `fastify.valkey` (the shared Valkey GLIDE
  instance). No standalone Valkey clients are instantiated.

### Error handling
- Domain errors extend `AppError` (`ConflictError`, `NotFoundError`,
  `ForbiddenError`, `UnauthorizedError`, `ValidationError`). No custom error
  response shapes are built inside handlers; the shared error handler
  serializes via `toJSON()`.

### Logging & observability
- No PII, full request/response bodies, or raw Zod payloads in log statements.
  Stable non-sensitive identifiers (user ID, action metadata) are acceptable in
  audit logs.
- OpenTelemetry trace and Prometheus metric instrumentation is not removed from
  request paths.

### Web data layer (apps/web)
- Query keys are written only in a feature's `queries.ts` (key factory +
  `defineQueryOptions` bundles). No query-key literals elsewhere.
- `mutations.ts` wraps `useMutation`; each mutation invalidates the feature's
  keys in `onSettled` via `useQueryCache()`.
- Components never call `api` directly — API calls live in feature
  queries/mutations, consumed through `composables/`.
- Pinia stores hold client-only state (UI prefs, wizard/session state). Server
  data stays in the Colada query cache.
- Every reactive value used inside a `query` function appears in its `key`
  (getter key: `key: () => [...]`).
- API types come from `@monorepo-fastify-api-vue/api-client`; no hand-written
  API types, no per-feature `api/` or `types/` folders.
- Features import from `@/shared/*`, never from a sibling feature.

### Testing
- Every new or changed route behavior has a corresponding `app.inject()` test
  covering: auth failures (401), permission failures (403), validation errors
  (400), success path, and any pagination or soft-delete behavior, plus
  audit-log side effects and sensitive-field omission where relevant.
- Tests hit the real database and Valkey — do not suggest mocking them. Use
  `createTestApp()` and `registerAndLogin()` from `src/tests/fixtures/`.

## Plugin registration order

Flag as Important if the registration order in `app.ts` is changed. The
required order is: `env` → `db` → `valkey` → `rate-limit` → `helmet` → `cors`
→ `cookie` → `jwt` → `request-context` → auth decorators → routes.

## Verification bar

Behavior claims require a `file:line` citation in the source, not an inference
from naming. Do not post a finding based on a function name alone.

## Re-review convergence

After the first review on a PR, suppress new Nits on subsequent pushes. Post
Important findings only once the code is in a "polishing" state.

## Summary shape

Open the review body with a one-line tally, for example:
`1 blocking, 3 nits` or `No blocking issues found — 2 nits`.
