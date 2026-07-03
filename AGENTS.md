# Repository Guidelines

## Monorepo Layout

nub-managed workspace with two apps and two shared packages:

```
apps/api/        @monorepo-fastify-api-vue/api     Fastify API (Docker + PostgreSQL + Valkey)
apps/web/        @monorepo-fastify-api-vue/web      Vue 3 + Vite frontend
packages/api-client/   @monorepo-fastify-api-vue/api-client  Typed fetch client (re-exports Fastify contract)
packages/eslint-config/ @monorepo-fastify-api-vue/eslint-config  Shared ESLint via @antfu/eslint-config
```

Root scripts run across all workspaces:

- `nub run dev` — starts each workspace `dev` (web: Vite; API: Docker reminder)
- `nub run build` — builds all workspaces
- `nub run lint` — lints all workspaces
- `nub run test` — runs tests across all workspaces

Dev workflow: `docker-compose up -d` first (starts API + DB + Valkey), then `nub run dev` for the Vite web dev server. Web proxies `/api` → `http://localhost:3000`.

api-client usage in Vue — import the singleton from `src/shared/api/client.ts`:

```ts
import { api } from '@/shared/api/client';
const users = await api.users.list({ query: { page: 1, limit: 10 } });
```

The singleton base URL is controlled by `VITE_API_URL` (baked at build time). Leave unset for local dev and Docker; set to the VPS URL for S3/CDN deploys. See [README.md](README.md) for details.

### Web (apps/web) structure

Feature-based layout under `apps/web/src/`. Data fetching uses Pinia Colada (`useQuery` / `useMutation`) on top of Pinia — see `apps/web/README.md` for the full annotated tree.

- `app/` — app-level setup: `layouts/` (app shells) and `plugins/` (`plugins/index.ts` exports `registerPlugins(app)` installing Pinia + PiniaColada; `plugins/pinia-colada.ts` holds global query/mutation defaults).
- `features/<feature>/` — `views/`, `components/` (feature-only), `composables/`, `queries.ts`, `mutations.ts`, `stores/`, and a `routes.ts` exporting `RouteRecordRaw[]`; `router/index.ts` only aggregates feature routes.
- `shared/` — cross-feature components, composables, and utilities.

Data-layer rules:

- `queries.ts` is the only place query keys are written: export a key factory (e.g. `HEALTH_KEYS`) plus `defineQueryOptions` bundles. No query-key literals elsewhere.
- `mutations.ts` holds `useMutation` wrappers; each mutation invalidates the feature's keys in `onSettled` via `useQueryCache()`.
- Components import from `composables/`, which compose queries/mutations with UI state. Use `defineQuery` when multiple mounted components must share reactive state.
- Pinia `stores/` are for client-only state (UI prefs, wizard/session state). Server data lives in the Colada query cache, never duplicated into stores.
- Every reactive value used inside a `query` function must appear in its `key` (use a getter key: `key: () => [...]`).
- Prefer `useQuery`/`useMutation` over hand-rolled `ref` + `onMounted` fetch state.

Import rules:

- A feature may import from `@/shared/*` (including `@/shared/api/client`), never from a sibling feature. Enforced by ESLint (`no-restricted-imports` in `apps/web/eslint.config.mjs`): importing another feature's `@/features/*` path inside `src/features/**` errors; a feature's own files are reachable via `./` or `@/features/<self>`.
- Parent-relative (`../`) imports are ESLint errors in both apps — always use the `@/` alias to reach outside the current directory.
- Components never call `api` directly — API calls live in feature queries/mutations (consumed through composables).
- API types come from `@monorepo-fastify-api-vue/api-client`; do not hand-write them. No per-feature `api/` or `types/` folders.

## Project Structure & Module Organization

This is a Fastify TypeScript API. Source code lives in `src/`, with startup in `server.ts` and app assembly in `app.ts`. Domain modules are under `src/modules/<domain>/` and usually contain `routes/`, `services/`, and `schemas/`. Shared errors, hooks, decorators, and schemas live in `src/common/`; plugins in `src/plugins/`; database schema in `src/db/schema/`; and portable RPC contracts in `src/contract/schemas/`. Tests live in `src/tests/`, with fixtures in `src/tests/fixtures/`.

## Build, Test, and Development Commands

Run from the repo root (delegates to the API container via Docker):

- `nub run test` — runs Vitest integration tests inside the app container.
- `nub run lint` / `nub run lint:fix` — lints all workspaces.
- `nub run db:generate` — generates Drizzle migrations after schema edits.
- `nub run db:migrate` — applies migrations to dev + test databases.
- `nub run db:seed` — seeds the dev database.

Or run directly inside the API container with `nub`:

- `docker-compose up -d` starts Postgres, Valkey, the app, Drizzle Studio, and pgAdmin.
- `nub run build` compiles TypeScript and resolves path aliases with `tsc-alias`.
- `nub run test:unit` runs Vitest integration tests inside the app container.
- `docker exec -e NODE_ENV=test fastify_api nubx vitest run src/tests/modules/users.test.ts` runs one test file.
- `nub run lint` checks `src/` with ESLint; `nub run lint:fix` applies automatic fixes.
- `nub run db:generate` creates Drizzle migrations after schema edits; `nub run db:migrate` applies them.

## Coding Style & Naming Conventions

Use TypeScript ES modules and the `@/` alias for imports from `src/`; parent-relative (`../`) imports are ESLint errors. Follow the ESLint setup based on `@antfu/eslint-config`; run `nub run lint` before submitting changes. Prefer Zod for validation and derive types with `z.infer<>` instead of hand-written interfaces. Keep services free of Fastify imports and inject `db` explicitly. Contract schema files in `src/contract/schemas/` must only import from `zod` and `@/contract/types.js`.

## Testing Guidelines

Tests use Vitest and exercise the real database and Valkey; do not mock these dependencies. Create apps with `createTestApp()` and authenticate with `registerAndLogin()` from `src/tests/fixtures/index.ts`. Use `app.inject()` for HTTP requests. Name module tests with the pattern `src/tests/modules/<domain>.test.ts`.

## Review Guidelines

### Access Control

- Every non-public route in `src/contract/schemas/` must have `auth: true` or `permission`; accept `optionalAuth` only when anonymous access is intentional and tested.
- RPC access control flows through contract flags → `fastify.authenticate` / `fastify.optionalAuthenticate` → `fastify.requirePermission()` in `src/plugins/rpc.ts`. Handler-level user checks are only acceptable for ownership rules (e.g. user can only modify their own resource).
- Dynamic permissions are stored in the database (roles/permissions tables); never hard-code permission strings outside `src/common/constants/index.ts`.

### Schema & Validation

- Use Zod for all params, query, body, and every declared response status. Derive types with `z.infer<>` — no hand-written interfaces.
- Contract schemas in `src/contract/schemas/` must only import from `zod`, `@/contract/types.js`, `@/common/constants/`, `@/common/schemas/`, and `@/modules/<domain>/schemas/`. No Fastify, Drizzle, or server-side imports. Module schemas referenced from contracts must themselves be pure Zod (browser-safe).
- Route handlers must return only the statuses declared in the contract schema (`responses` map). Undeclared statuses will not be serialized correctly by `fastify-type-provider-zod`.

### Services & Architecture

- Services must be framework-free: no `FastifyRequest`, `FastifyReply`, decorators, or `request.server`. Inject `db` (Drizzle `postgres-js` client), `valkey` (Valkey GLIDE client), and primitive values explicitly.
- Never import from `src/plugins/` or `src/modules/` inside a service; services are consumed by route handlers, not the reverse.

### Database (Drizzle + PostgreSQL)

- All `timestamp` columns use `{ withTimezone: true }` (TIMESTAMPTZ). Never use bare `timestamp()`.
- Drizzle queries must include: ownership filters, soft-delete filters (`deletedAt IS NULL`), pagination limits on list queries, and unique-conflict handling.
- Multi-write flows require a Drizzle transaction. Check for N+1 queries in loops — prefer `.where(inArray(...))` batch fetches.
- Schema changes require a generated migration (`nub run db:generate`) and backwards-compatibility notes if existing data is affected. Add indexes on foreign keys and columns used in common filters.

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
