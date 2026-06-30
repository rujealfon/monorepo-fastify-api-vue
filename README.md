# Fastify API

A production-ready REST API built with **Fastify 5**, **TypeScript**, **PostgreSQL**, **Valkey**, and **Drizzle ORM**, following a domain-driven architecture designed to scale from medium to large applications.

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
| Package Manager | [nub](https://nub.sh) (pnpm under the hood) |

## Project Structure

```
src/
├── app.ts                        # Fastify application factory (plugin registration order)
├── server.ts                     # Entry point — init telemetry + graceful shutdown
├── telemetry.ts                  # OpenTelemetry SDK setup
├── config/                       # Environment config schema + type augmentation
├── db/
│   ├── index.ts                  # Drizzle client + connection pool
│   ├── seed.ts                   # Seed file — roles, permissions, role_permissions
│   └── schema/                   # Table definitions (users, roles, permissions, …)
├── plugins/                      # One file per Fastify plugin
│   ├── sensible.ts               # @fastify/sensible — httpErrors, reply helpers
│   ├── compress.ts               # @fastify/compress — brotli/gzip/deflate responses
│   ├── helmet.ts                 # @fastify/helmet — security headers
│   ├── cors.ts                   # @fastify/cors
│   ├── cookie.ts                 # @fastify/cookie — signed cookie support
│   ├── valkey.ts                 # Shared Valkey GLIDE connection
│   ├── rate-limit.ts             # @fastify/rate-limit (Valkey-backed, multi-instance safe)
│   ├── under-pressure.ts         # @fastify/under-pressure — auto-503 under load
│   ├── multipart.ts              # @fastify/multipart — file upload support
│   ├── request-context.ts        # @fastify/request-context — AsyncLocalStorage per request
│   ├── jwt.ts                    # @fastify/jwt
│   ├── db.ts                     # Decorates fastify.db
│   ├── metrics.ts                # prom-client — /metrics endpoint
│   ├── scalar.ts                 # @fastify/swagger + Scalar UI
│   └── rpc.ts                    # createFastifyRpcPlugin — registers RouteMap as Fastify routes
├── contract/                     # RPC contract layer (shared between server and client)
│   ├── types.ts                  # RouteSchema<> (generic typed) + RouteMap (plain record)
│   ├── client.ts                 # createApiClient — type-safe fetch client + RpcError
│   ├── index.ts
│   └── schemas/                  # Per-domain route schemas (auth, users, roles, permissions, …)
├── common/                       # Cross-cutting concerns shared across all modules
│   ├── constants/                # Shared constants & enums (Postgres error codes)
│   ├── decorators/               # fastify.authenticate, fastify.requireAdmin, fastify.requirePermission
│   ├── errors/                   # AppError hierarchy (401, 403, 404, 409, 422)
│   ├── hooks/                    # request-id propagation + request context wiring
│   └── schemas/                  # Shared Zod schemas (pagination, uuid, apiError)
├── modules/                      # Domain modules
│   └── <domain>/
│       ├── schemas/index.ts      # Zod schemas → types via z.infer<>
│       ├── services/             # Business logic + DB queries (no Fastify imports)
│       └── routes/index.ts       # Fastify plugin: schema + handler wiring
└── tests/
    ├── fixtures/                 # createTestApp(), registerAndLogin(), resetDb() helpers
    └── modules/                  # Integration tests per module
```

## Getting Started

### Prerequisites

- Docker
- [nub CLI](https://nub.sh) (`npm i -g nub`)

See [DOCKER.md](DOCKER.md) for the full step-by-step setup.

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs (min 32 chars) |
| `VALKEY_URL` | ✅ | — | Valkey connection string (use `redis://`, e.g. `redis://localhost:6379`) |
| `MOBILE_API_KEY` | ✅ | — | Shared secret for mobile clients using `x-mobile-api-key` |
| `TEST_DATABASE_URL` | | *(empty)* | PostgreSQL connection string used by test runs |
| `PORT` | | `3000` | Server port |
| `HOST` | | `0.0.0.0` | Server host |
| `NODE_ENV` | | `development` | `development` \| `production` \| `test`. Rate limiting is enabled only in production. |
| `LOG_LEVEL` | | `info` | Pino log level |
| `COOKIE_SECRET` | | *(JWT_SECRET)* | Secret for signed cookies — falls back to `JWT_SECRET` if empty |
| `OTEL_ENDPOINT` | | *(disabled)* | OTLP HTTP endpoint (e.g. `http://localhost:4318/v1/traces`). Leave empty to disable tracing. |
| `TRUST_PROXY` | | *(disabled)* | Fastify trusted proxy setting for production client IPs, e.g. `127.0.0.1`, `10.0.0.0/8`, or `1` trusted hop |

## API Documentation

The [Scalar API reference](https://scalar.com) is served at `http://localhost:3000/` when the server is running. The raw OpenAPI spec (JSON) is at `/openapi.json` for import into Postman, Insomnia, or other tooling.

## Available Scripts

All scripts run via `nub` (or `nubx` inside containers). See [package.json](package.json) for the full list.

| Script | Description |
|---|---|
| `nub build` | Compile TypeScript to `dist/` |
| `nub db:generate` | Generate a migration file after schema changes |
| `nub db:migrate` | Apply pending migrations (dev + test databases) |
| `nub db:seed` | Insert seed roles and permissions (idempotent) |
| `nub lint` | Lint with ESLint |
| `nub lint:fix` | Auto-fix lint issues |
| `nub test:unit` | Run integration tests inside the app container |

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register — creates account and assigns the `user` role |
| POST | `/api/v1/auth/login` | — | Login — sets a `token` httpOnly cookie (web) |
| POST | `/api/v1/auth/mobile/login` | `x-mobile-api-key` | Login for mobile — returns `token` in body, no cookie |
| POST | `/api/v1/auth/logout` | — | Logout — clears the `token` cookie |

Auth entry points (`register`, `login`, and `mobile/login`) are rate-limited to 5 requests per 15 minutes per client key in production. Development and test runs skip rate limiting so local API clients and integration tests are not throttled.

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

Each log entry records `action`, `resource_type`, `resource_id`, `metadata`, and `created_at`. Logged actions: `auth.registered`, `auth.logged_in`, `auth.logged_out`, `auth.account_restored`, `user.created`, `user.updated`, `user.deleted`, `product.created`, `product.updated`, `product.deleted`.

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health/live` | Liveness probe — always 200 if process is up |
| GET | `/health/ready` | Readiness probe — checks DB + Valkey connectivity |
| GET | `/health/details` | System details — heap, RSS, event loop lag, pressure status |

### Observability

| Method | Path | Description |
|---|---|---|
| GET | `/metrics` | Prometheus metrics (prom-client default + Node.js metrics) |

> **Production note:** `/metrics` should be restricted at the network/gateway level and not exposed publicly.

### Deployment Notes

In production, rate-limit keys prefer the leftmost `X-Forwarded-For` entry so clients behind a reverse proxy are keyed by their originating IP. Only allow trusted proxies or gateways to set or forward `X-Forwarded-For`; if clients can send that header directly to the app, they can spoof different IPs and evade per-IP limits. Deployments should strip inbound forwarding headers at the edge and re-add them from the trusted proxy layer.

### Pagination

All list endpoints accept `?page=1&limit=10` query parameters.

### Authentication

Two login endpoints cover the two client types:

| Client | Endpoint | Strategy |
|---|---|---|
| Web browser | `POST /api/v1/auth/login` | Sets an httpOnly cookie (`SameSite=Strict`, `Secure` in production) — sent automatically on every request |
| Mobile app (Ionic/Capacitor, React Native) | `POST /api/v1/auth/mobile/login` | Requires `x-mobile-api-key`, returns `data.token` in the response body, no cookie — store in secure storage and send as `Authorization: Bearer <token>` |
| Server-to-server / tests | Either | Bearer token is simpler |

```
Authorization: Bearer <token>
```

## Role-Based Access Control (RBAC)

Access to protected endpoints is controlled by a **dynamic, database-driven RBAC system**. Roles and permissions are stored in PostgreSQL and loaded fresh on every authenticated request — no re-login required after permission changes.

### Permission format

Permissions follow the `resource:action:scope` format:

| Permission | Meaning |
|---|---|
| `user:read:any` | Read any user's data |
| `user:read:own` | Read only your own user data |
| `user:update:any` | Update any user |
| `user:update:own` | Update only your own account |
| `role:create:any` | Create new roles |
| `role:read:any` | List and view roles |
| `role:update:any` | Modify roles and their permission assignments |
| `role:delete:any` | Delete custom roles |
| `permission:read:any` | List available permissions |
| `audit-log:read:any` | List all audit logs |

### Seeded roles

Three roles are created by `nub db:seed` (idempotent):

| Role | System role | Permissions |
|---|---|---|
| `super-admin` | Yes | All 15 permissions + unconditional bypass of all permission checks |
| `admin` | No | All `user:*`, `role:read:any`, `permission:read:any`, `audit-log:read:any` |
| `user` | No | `user:read:own`, `user:update:own` |

**System roles** (`isSystemRole: true`) cannot be deleted via the API. The `super-admin` role bypasses all permission checks entirely — useful for bootstrapping and emergency access. Users registering via `/api/v1/auth/register` are automatically assigned the `user` role.

### How it works

1. Every authenticated request verifies the JWT then loads the user's roles and permissions from the DB via a single JOIN query.
2. `permissions: string[]` and `isSuperAdmin: boolean` are stored in the per-request context.
3. Route handlers call `fastify.requirePermission('resource:action:scope')` (set in the contract schema) as a preValidation hook. Super-admins bypass this check.
4. Own-resource checks (e.g. updating your own account) are enforced inside the route handler using the stored `userId` from context.

### Why permissions are static

Permissions are intentionally **seed-only** — there is no API to create, update, or delete them. This is by design.

Every permission string like `user:read:any` is meaningful only because **code explicitly checks for it** via `requirePermission('user:read:any')` on a specific route. Adding a permission through an API without a corresponding code guard would be a no-op — it could be assigned to roles and users, but nothing in the system would ever enforce it.

The flexibility the system provides is at the **role** layer, not the permission layer: you can create custom roles and freely assign any combination of the available permissions to them. This covers all practical use cases (e.g. an `editor` role with `product:update:any` but not `user:delete:any`) without the risk of permission strings that exist in the database but are never checked in code.

To introduce a new permission, the correct process is:
1. Add `requirePermission('x:y:z')` to the route that should be guarded
2. Add the permission to `src/db/seed.ts`
3. Run `nub db:seed` on deploy

**When you'd add new permissions:**

- **New resource type** — adding an `invoices` module means seeding `invoice:create:any`, `invoice:read:any`, etc. alongside the new routes.
- **New action on an existing resource** — e.g. a bulk-delete users endpoint would need a `user:bulk-delete:any` permission wired to that route.
- **Finer scope on an existing permission** — e.g. if products become user-owned, you'd split `product:read:any` into `product:read:own` + `product:read:any` and update the route guards accordingly.

If there is no new route guard (`requirePermission` call in code), there is no new permission to add.

### Customising roles

```bash
# Create a custom role (super-admin token required)
curl -X POST http://localhost:3000/api/v1/roles \
  -H 'Authorization: Bearer <super-admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"editor","description":"Can edit content"}'

# Assign a permission to it
curl -X POST http://localhost:3000/api/v1/roles/<roleId>/permissions/<permId> \
  -H 'Authorization: Bearer <super-admin-token>'

# Assign the role to a user
curl -X POST http://localhost:3000/api/v1/users/<userId>/roles/<roleId> \
  -H 'Authorization: Bearer <super-admin-token>'
```

## Example Usage

```bash
# Register — automatically assigned the 'user' role
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret1234"}'

# Login — cookie saved to jar.txt
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret1234"}' \
  -c jar.txt
# → {"success":true,"data":{"id":"...","email":"alice@example.com"}}

# List roles (requires role:read:any — admin or super-admin only)
curl http://localhost:3000/api/v1/roles -b jar.txt

# List available permissions (requires permission:read:any)
curl http://localhost:3000/api/v1/permissions -b jar.txt

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout -b jar.txt -c jar.txt

# Prometheus metrics
curl http://localhost:3000/metrics
```

## RPC Layer

Routes are defined once in `src/contract/schemas/` as a `RouteMap` — a plain object mapping route names to their method, path, Zod schemas, and auth/permission flag. This contract is shared between the server and any client.

**Server** — `createFastifyRpcPlugin(schema, handlers)` registers all routes on a Fastify instance. Handlers receive fully-typed `{ query, params, body, request, reply }` and must return a typed `{ status, body }` union. Each route schema accepts an optional `permission` string (e.g. `'user:read:any'`) which is wired as a preValidation hook automatically.

**Client** — `createApiClient(baseUrl, { getToken })` returns a namespaced client (`client.users.list(...)`, `client.roles.create(...)`) backed by native `fetch`. All inputs and return types are inferred from the same contract schemas.

```ts
// Contract (src/contract/schemas/roles.ts)
export const rolesSchema = {
  list: {
    method: 'GET',
    path: '/api/v1/roles',
    permission: 'role:read:any',
    responses: { 200: apiListSchema(roleSchema), ... },
  },
  // ...
} satisfies RouteMap

// Server
const plugin = createFastifyRpcPlugin(rolesSchema, {
  list: async ({ request }) => ({
    status: 200,
    body: { success: true, data: await roleService.findAllRoles(request.server.db), ... },
  }),
})

// Client
const api = createApiClient('http://localhost:3000', { getToken: () => token })
const roles = await api.roles.list({})
```

Errors from the server surface as `RpcError` (with `.status` and `.data`) on the client.

## Architecture Notes

- **Contract-first RPC** — `src/contract/` is the single source of truth for route shapes. `createFastifyRpcPlugin` wires the server; `createApiClient` wires the client. A schema change is a type error on both sides simultaneously.
- **Plugin registration order** in `app.ts` is intentional: `env` must be first, `valkey` must precede `rate-limit`, `request-context` must precede `auth-decorator` (context must exist before being written to).
- **Dynamic RBAC** — permissions are loaded from the DB on every request, not embedded in the JWT. Role changes take effect immediately without re-login. Valkey caching is a future upgrade path.
- **Zod is the single source of truth** for types — no manual interfaces. All types are derived via `z.infer<>` from schemas in each module's `schemas/index.ts`.
- **Services have no Fastify imports** — they receive `db` as a parameter, making them independently testable.
- **Error handling** is centralized in `app.ts` via `setErrorHandler`. All domain errors extend `AppError`.
- **Rate limiting** uses Valkey as the store — safe for multi-instance / horizontally scaled deployments. It is active only when `NODE_ENV=production`; development and test runs skip it.
- **Request context** (`@fastify/request-context`) stores `requestId`, `userId`, `permissions`, and `isSuperAdmin` via AsyncLocalStorage, accessible anywhere in the call stack without passing them explicitly.
- **Audit logging** is fire-and-forget (`logAudit` in `src/modules/audit-logs/helpers/`) — inserts never block the request path. Failures are silently swallowed so a logging error never surfaces to the caller.
- **Graceful shutdown** is handled in `server.ts` — `SIGINT`/`SIGTERM` closes Fastify (draining connections) and flushes OpenTelemetry spans before exiting.
