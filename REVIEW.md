# Review instructions

## What Important means here

Reserve 🔴 Important for findings that would break production behavior, open a
security hole, or corrupt data:

- Logic bugs that return wrong results or silently swallow errors
- Authentication/authorization bypasses (missing `fastify.authenticate`,
  incorrect `requirePermission`, ownership checks skipped)
- PII or sensitive values logged, serialized to clients, or stored in plaintext
  (passwords, JWTs, cookies, reset tokens, `passwordHash`)
- Soft-delete filter (`deletedAt IS NULL`) missing on queries that should
  respect it
- Missing transaction on multi-write flows
- `timestamp()` columns without `{ withTimezone: true }` (must be TIMESTAMPTZ)
- Backwards-incompatible database migrations applied to live data without a
  compatibility note
- Security header or cookie flag regressions (`httpOnly`, `secure`, `sameSite`,
  CORS origin whitelist, Helmet defaults weakened)
- N+1 queries in request handlers (prefer `inArray` batch fetches)
- Pagination limit missing on unbounded list queries
- A contract `responses` status used in a handler but not declared in the
  schema (breaks `fastify-type-provider-zod` serialization)
- Missing unique-conflict handling where duplicate writes are possible
- Raw library exceptions, SQL errors, or stack traces surfaced to clients

Style, naming, missing comments, and test coverage are 🟡 Nit at most.

## Cap the nits

Report at most five 🟡 Nits per review. If you found more, write "plus N
similar items" in the summary rather than posting them inline. If every finding
is a Nit, open the summary with "No blocking issues found."

## Do not report

- Anything ESLint already enforces (formatting, import order, unused variables)
- Generated files: `migrations/`, `dist/`, `pnpm-lock.yaml`, `*.lock`
- Drizzle migration snapshots under `migrations/meta/`
- Test fixtures and seed data that intentionally violate production rules
- OpenTelemetry and Prometheus instrumentation boilerplate — do not flag it as
  dead code or complexity
- Suggestions to add comments or JSDoc; the codebase is intentionally lean on
  comments

## Always check

### Access control
- Every non-public route in `src/contract/schemas/` has `auth: true` or a
  `permission` field; `optionalAuth` is only present when anonymous access is
  intentional.
- Route handlers that enforce ownership (e.g. "user can only edit their own
  resource") do so with a handler-level check after `authenticate` runs, not
  instead of it.

### Schema & validation
- Request params, query, body, and every declared response status use a Zod
  schema. Types are derived with `z.infer<>` — no hand-written interfaces.
- Contract schemas in `src/contract/schemas/` import only from `zod` and
  `@/contract/types.js`. No Fastify, Drizzle, or server-side imports.

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

### Valkey
- Valkey is accessed through `fastify.valkey` (the shared Valkey GLIDE instance).
  No standalone Valkey clients are instantiated.

### Error handling
- Domain errors extend `AppError` (`ConflictError`, `NotFoundError`,
  `ForbiddenError`, `UnauthorizedError`, `ValidationError`). No custom error
  response shapes are built inside handlers.

### Logging & observability
- No PII, full request/response bodies, or raw Zod payloads in log statements.
  Stable non-sensitive identifiers (user ID, action metadata) are acceptable in
  audit logs.
- OpenTelemetry trace and Prometheus metric instrumentation is not removed from
  request paths.

### Testing
- Every new or changed route behavior has a corresponding `app.inject()` test
  covering: auth failures (401), permission failures (403), validation errors
  (422/400), success path, and any pagination or soft-delete behavior.

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
