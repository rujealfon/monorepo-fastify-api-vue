# Repository Guidelines

## Project Structure & Module Organization

This is a Fastify TypeScript API. Source code lives in `src/`, with startup in `server.ts` and app assembly in `app.ts`. Domain modules are under `src/modules/<domain>/` and usually contain `routes/`, `services/`, and `schemas/`. Shared errors, hooks, decorators, and schemas live in `src/common/`; plugins in `src/plugins/`; database schema in `src/db/schema/`; and portable RPC contracts in `src/contract/schemas/`. Tests live in `src/tests/`, with fixtures in `src/tests/fixtures/`.

## Build, Test, and Development Commands

Run project scripts with `nub`; Docker services are required for most tasks.

- `docker-compose up -d` starts Postgres, Valkey, the app, Drizzle Studio, and pgAdmin.
- `nub build` compiles TypeScript and resolves path aliases with `tsc-alias`.
- `nub test:unit` runs Vitest integration tests inside the app container.
- `docker exec -e NODE_ENV=test fastify_app nubx vitest run src/tests/modules/users.test.ts` runs one test file.
- `nub lint` checks `src/` with ESLint; `nub lint:fix` applies automatic fixes.
- `nub db:generate` creates Drizzle migrations after schema edits; `nub db:migrate` applies them.

## Coding Style & Naming Conventions

Use TypeScript ES modules and the `@/` alias for imports from `src/`. Follow the ESLint setup based on `@antfu/eslint-config`; run `nub lint` before submitting changes. Prefer Zod for validation and derive types with `z.infer<>` instead of hand-written interfaces. Keep services free of Fastify imports and inject `db` explicitly. Contract schema files in `src/contract/schemas/` must only import from `zod` and `@/contract/types.js`.

## Testing Guidelines

Tests use Vitest and exercise the real database and Valkey; do not mock these dependencies. Create apps with `createTestApp()` and authenticate with `registerAndLogin()` from `src/tests/fixtures/index.ts`. Use `app.inject()` for HTTP requests. Name module tests with the pattern `src/tests/modules/<domain>.test.ts`.

## Review Guidelines

### Access Control
- Every non-public route in `src/contract/schemas/` must have `auth: true` or `permission`; accept `optionalAuth` only when anonymous access is intentional and tested.
- RPC access control flows through contract flags → `fastify.authenticate` / `fastify.optionalAuthenticate` → `fastify.requirePermission()` in `src/plugins/rpc.ts`. Handler-level user checks are only acceptable for ownership rules (e.g. user can only modify their own resource).
- Dynamic permissions are stored in the database (roles/permissions tables); never hard-code permission strings outside `src/common/constants/index.ts`.

### Schema & Validation
- Use Zod for all params, query, body, and every declared response status. Derive types with `z.infer<>` — no hand-written interfaces.
- Contract schemas in `src/contract/schemas/` must only import from `zod` and `@/contract/types.js`. No Fastify, Drizzle, or server-side imports.
- Route handlers must return only the statuses declared in the contract schema (`responses` map). Undeclared statuses will not be serialized correctly by `fastify-type-provider-zod`.

### Services & Architecture
- Services must be framework-free: no `FastifyRequest`, `FastifyReply`, decorators, or `request.server`. Inject `db` (Drizzle `postgres-js` client), `valkey` (Valkey GLIDE client), and primitive values explicitly.
- Never import from `src/plugins/` or `src/modules/` inside a service; services are consumed by route handlers, not the reverse.

### Database (Drizzle + PostgreSQL)
- All `timestamp` columns use `{ withTimezone: true }` (TIMESTAMPTZ). Never use bare `timestamp()`.
- Drizzle queries must include: ownership filters, soft-delete filters (`deletedAt IS NULL`), pagination limits on list queries, and unique-conflict handling.
- Multi-write flows require a Drizzle transaction. Check for N+1 queries in loops — prefer `.where(inArray(...))` batch fetches.
- Schema changes require a generated migration (`nub db:generate`) and backwards-compatibility notes if existing data is affected. Add indexes on foreign keys and columns used in common filters.

### Valkey & Plugins
- Valkey is registered by `src/plugins/valkey.ts`; access through `fastify.valkey`. Do not instantiate separate Valkey clients elsewhere.
- Plugin registration order in `app.ts` must be preserved: `env` → `db` → `valkey` → `rate-limit` → `helmet` → `cors` → `cookie` → `jwt` → `request-context` → auth decorators → routes.
- Changes to `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/cors`, `@fastify/jwt`, or `@fastify/cookie` must not weaken production defaults (e.g. sameSite, httpOnly, secure flags on cookies; CORS origin whitelist).
- OpenTelemetry (`@opentelemetry/auto-instrumentations-node`) and Prometheus (`prom-client`) instrumentation must remain intact; do not remove trace/metric instrumentation from request paths.

### Security
- Passwords are hashed with `bcryptjs`. Never store or log plaintext passwords, JWTs, cookies, authorization headers, or reset tokens.
- Never expose `passwordHash`, soft-deleted records, internal error details, stack traces, SQL errors, or raw library exceptions to clients.
- Do not log PII, full request/response bodies, or raw Zod validation payloads. Audit logs may include stable non-sensitive identifiers (e.g. user ID) and action metadata.
- JWT signing/expiry, cookie flags (`httpOnly`, `secure`, `sameSite`), and permission strings are security boundaries — review carefully before approving changes.

### Errors
- Domain errors must extend `AppError` (`ConflictError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`). The shared error handler in `src/common/` serializes them via `toJSON()`; do not build custom error response shapes in handlers.
- Use `uuidv7` for all generated IDs to maintain time-ordered UUIDs.

### Testing
- Add or update `app.inject()` tests for every route behavior change: auth failures (401), permission failures (403), validation errors (422), pagination, soft-delete behavior, audit-log side effects, and sensitive-field omission.
- Tests hit the real database and Valkey — do not mock them. Use `createTestApp()` and `registerAndLogin()` from `src/tests/fixtures/index.ts`.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative summaries such as `Add profile module with API endpoint for user data retrieval` and `Refactor API response structure for consistency and clarity`. Keep commits focused and describe the behavior changed. Pull requests should include a short summary, relevant issue links, migration notes when database schema changes, and the commands run for validation.

## Database Schema Conventions

All `timestamp` columns use `{ withTimezone: true }` (maps to Postgres `TIMESTAMPTZ`). Postgres stores these internally as UTC and converts on read, so values are always timezone-safe regardless of the DB session timezone. Never use bare `timestamp()` for new columns.

## Architecture & Configuration Notes

Preserve the plugin registration order in `app.ts`: `env` first, Valkey before rate limiting, and request context before auth and request ID hooks. Domain errors should extend `AppError` and use existing subclasses such as `NotFoundError`, `UnauthorizedError`, `ConflictError`, and `ValidationError`. Copy `.env.example` to `.env`; required variables include `DATABASE_URL`, `JWT_SECRET`, and `VALKEY_URL`.
