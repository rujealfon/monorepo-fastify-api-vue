# @monorepo-fastify-api-vue/api

A production-ready REST API built with **Fastify 5**, **TypeScript**, **PostgreSQL**, **Valkey**, and **Drizzle ORM**, following a domain-driven architecture designed to scale from medium to large applications.

> Part of the [monorepo-fastify-api-vue](../../README.md) monorepo. Runs inside Docker — see [DOCKER.md](../../DOCKER.md) for setup.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Fastify 5](https://fastify.dev) |
| Language | TypeScript 5.9 (NodeNext modules) |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| Cache / Rate-limit store | Valkey via [Valkey GLIDE](https://glide.valkey.io/) |
| Validation | [Zod](https://zod.dev) + [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) |
| Auth | JWT via [@fastify/jwt](https://github.com/fastify/fastify-jwt) |
| API Docs | [Scalar](https://scalar.com) + [@fastify/swagger](https://github.com/fastify/fastify-swagger) (OpenAPI 3.0) |
| Metrics | [prom-client](https://github.com/siimon/prom-client) — Prometheus endpoint at `/metrics` |
| Tracing | [OpenTelemetry](https://opentelemetry.io/) (OTLP HTTP, optional via `OTEL_ENDPOINT`) |
| RPC | Contract-first RPC — shared schemas, `createFastifyRpcPlugin`, type-safe `createApiClient` |
| Testing | [Vitest](https://vitest.dev) |
| Package Manager | [nub](https://nub.sh) |

## Project Structure

```
apps/api/
├── src/
│   ├── app.ts                        # Fastify application factory (plugin registration order)
│   ├── server.ts                     # Entry point — init telemetry + graceful shutdown
│   ├── telemetry.ts                  # OpenTelemetry SDK setup
│   ├── config/                       # Environment config schema + type augmentation
│   ├── db/
│   │   ├── index.ts                  # Drizzle client + connection pool
│   │   ├── seed.ts                   # Seed file — roles, permissions, role_permissions
│   │   └── schema/                   # Table definitions (users, roles, permissions, …)
│   ├── plugins/                      # One file per Fastify plugin
│   │   ├── valkey.ts                 # Shared Valkey GLIDE connection
│   │   ├── rate-limit.ts             # @fastify/rate-limit (Valkey-backed, multi-instance safe)
│   │   ├── rpc.ts                    # createFastifyRpcPlugin — registers RouteMap as Fastify routes
│   │   └── ...
│   ├── contract/                     # RPC contract layer (shared between server and client)
│   │   ├── types.ts                  # RouteSchema<> + RouteMap types
│   │   ├── client.ts                 # createApiClient — type-safe fetch client + RpcError
│   │   ├── index.ts                  # Public exports (re-exported via packages/api-client)
│   │   └── schemas/                  # Per-domain route schemas (auth, users, roles, …)
│   ├── common/                       # Cross-cutting concerns
│   │   ├── constants/                # Shared constants & enums
│   │   ├── decorators/               # fastify.authenticate, fastify.requirePermission
│   │   ├── errors/                   # AppError hierarchy (401, 403, 404, 409, 422)
│   │   ├── hooks/                    # request-id propagation + request context wiring
│   │   └── schemas/                  # Shared Zod schemas (pagination, uuid, apiError)
│   ├── modules/                      # Domain modules
│   │   └── <domain>/
│   │       ├── schemas/index.ts      # Zod schemas → types via z.infer<>
│   │       ├── services/             # Business logic + DB queries (no Fastify imports)
│   │       └── routes/index.ts       # Fastify plugin: schema + handler wiring
│   └── tests/
│       ├── fixtures/                 # createTestApp(), registerAndLogin(), resetDb()
│       └── modules/                  # Integration tests per module
├── migrations/                       # Drizzle SQL migrations
├── drizzle.config.ts
├── .env.example
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs (min 32 chars) |
| `VALKEY_URL` | ✅ | — | Valkey connection string (`redis://localhost:6379`) |
| `MOBILE_API_KEY` | ✅ | — | Shared secret for mobile clients |
| `TEST_DATABASE_URL` | | *(empty)* | PostgreSQL connection string for test runs |
| `PORT` | | `3000` | Server port |
| `HOST` | | `0.0.0.0` | Server host |
| `NODE_ENV` | | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | | `info` | Pino log level |
| `COOKIE_SECRET` | | *(JWT_SECRET)* | Secret for signed cookies |
| `OTEL_ENDPOINT` | | *(disabled)* | OTLP HTTP endpoint — leave empty to disable tracing |
| `CORS_ORIGIN` | | *(empty)* | Allowed CORS origin |
| `TRUST_PROXY` | | *(disabled)* | Fastify trusted proxy setting |

## Scripts

All scripts run via `nub`. Run from `apps/api/` or use `nub run --filter @monorepo-fastify-api-vue/api <script>` from the repo root.

| Script | Description |
|---|---|
| `nub run build` | Compile TypeScript to `dist/` |
| `nub run db:generate` | Generate a migration file after schema changes |
| `nub run db:migrate` | Apply pending migrations (dev + test databases) |
| `nub run db:seed` | Insert seed roles and permissions (idempotent) |
| `nub run lint` | Lint with ESLint |
| `nub run lint:fix` | Auto-fix lint issues |
| `nub run test:unit` | Run integration tests inside the app container |

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register — creates account, assigns `user` role |
| POST | `/api/v1/auth/login` | — | Login — sets a `token` httpOnly cookie |
| POST | `/api/v1/auth/mobile/login` | `x-mobile-api-key` | Login for mobile — returns `token` in body |
| POST | `/api/v1/auth/logout` | — | Logout — clears the `token` cookie |

Auth endpoints are rate-limited to 5 requests per 15 minutes per IP in production.

### Users

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/users` | `user:read:any` | List users (paginated) |
| GET | `/api/v1/users/:id` | `user:read:any` | Get user by ID |
| POST | `/api/v1/users` | `user:create:any` | Create a user |
| PATCH | `/api/v1/users/:id` | authenticated + self-or-`user:update:any` | Update a user |
| DELETE | `/api/v1/users/:id` | authenticated + self-or-`user:delete:any` | Soft-delete a user |
| POST | `/api/v1/users/:id/roles/:roleId` | `role:update:any` | Assign a role to a user |
| DELETE | `/api/v1/users/:id/roles/:roleId` | `role:update:any` | Remove a role from a user |

### Roles

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/roles` | `role:read:any` | List all roles |
| GET | `/api/v1/roles/:id` | `role:read:any` | Get role by ID |
| POST | `/api/v1/roles` | `role:create:any` | Create a role |
| PATCH | `/api/v1/roles/:id` | `role:update:any` | Update a role |
| DELETE | `/api/v1/roles/:id` | `role:delete:any` | Delete a role (system roles are protected) |
| POST | `/api/v1/roles/:id/permissions/:permId` | `role:update:any` | Assign a permission to a role |
| DELETE | `/api/v1/roles/:id/permissions/:permId` | `role:update:any` | Remove a permission from a role |

### Permissions

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/permissions` | `permission:read:any` | List all permissions |

### Products

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/products` | authenticated | List products (paginated) |
| GET | `/api/v1/products/:id` | authenticated | Get product by ID |
| POST | `/api/v1/products` | authenticated | Create a product |
| PATCH | `/api/v1/products/:id` | authenticated | Update a product |
| DELETE | `/api/v1/products/:id` | authenticated | Soft-delete a product |

### Audit Logs

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/audit-logs` | `audit-log:read:any` | List all audit logs (paginated) |
| GET | `/api/v1/users/:id/audit-logs` | authenticated + self-or-`user:read:any` | List logs for a specific user |

### Health & Observability

| Method | Path | Description |
|---|---|---|
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe — checks DB + Valkey |
| GET | `/health/details` | Heap, RSS, event loop lag, pressure status |
| GET | `/metrics` | Prometheus metrics |

## RPC Layer

Routes are defined once in `src/contract/schemas/` as a `RouteMap`. The contract is the single source of truth for both server and client.

**Server** — `createFastifyRpcPlugin(schema, handlers)` registers all routes. Handlers receive fully-typed `{ query, params, body, request, reply }`.

**Client** — `createApiClient(baseUrl, { getToken })` returns a namespaced typed client. Consumed via `@monorepo-fastify-api-vue/api-client` in the web app.

```ts
// Contract (src/contract/schemas/roles.ts)
export const rolesSchema = {
  list: {
    method: 'GET',
    path: '/api/v1/roles',
    permission: 'role:read:any',
    responses: { 200: apiListSchema(roleSchema) },
  },
} satisfies RouteMap

// Client (apps/web)
import { createApiClient } from '@monorepo-fastify-api-vue/api-client'
const api = createApiClient('http://localhost:3000', { getToken: () => token })
const roles = await api.roles.list({})
```

## Role-Based Access Control (RBAC)

Permissions follow the `resource:action:scope` format (e.g. `user:read:any`). Roles and permissions are stored in PostgreSQL and loaded on every authenticated request — no re-login required after changes.

### Seeded roles

| Role | System | Permissions |
|---|---|---|
| `super-admin` | Yes | All permissions + unconditional bypass |
| `admin` | No | All `user:*`, `role:read:any`, `permission:read:any`, `audit-log:read:any` |
| `user` | No | `user:read:own`, `user:update:own` |

Run `nub run db:seed` to insert (idempotent).

## Architecture Notes

- **Contract-first RPC** — `src/contract/` is the single source of truth for route shapes. A schema change is a type error on both server and client simultaneously.
- **Plugin registration order** in `app.ts` is fixed: `env` → `db` → `valkey` → `rate-limit` → `helmet` → `cors` → `cookie` → `jwt` → `request-context` → auth decorators → routes.
- **Dynamic RBAC** — permissions loaded from DB on every request, not embedded in the JWT.
- **Services have no Fastify imports** — receive `db` as a parameter, independently testable.
- **Rate limiting** uses Valkey — safe for multi-instance deployments. Active only in `NODE_ENV=production`.
- **Audit logging** is fire-and-forget — insert failures never surface to the caller.
