# src/

Application source code. Everything here compiles to `../dist/` via `tsc && tsc-alias`.

## Entry points

| File | Purpose |
|---|---|
| `server.ts` | Process entry — initialises OpenTelemetry, starts the HTTP server, registers graceful-shutdown handlers |
| `app.ts` | `buildApp()` factory — registers all plugins and routes in a fixed, dependency-aware order |
| `telemetry.ts` | OpenTelemetry SDK setup. Called before `buildApp()`. No-op when `OTEL_ENDPOINT` is unset. |

## Top-level directories

| Directory | Contains |
|---|---|
| `config/` | Environment variable schema (JSON Schema + Zod-compatible) and `AppConfig` type augmentation |
| `db/` | Drizzle ORM client factory and all table schema definitions |
| `plugins/` | One Fastify plugin file per concern (cors, valkey, rate-limit, compress, …) |
| `common/` | Cross-cutting utilities: decorators, error classes, hooks, shared Zod schemas |
| `contract/` | RPC contract layer — `RouteMap` schemas, `createApiClient`, shared between server and client |
| `modules/` | Domain modules — each contains schemas, services, controllers, routes |
| `tests/` | Integration tests (Vitest) and shared test helpers |
| `utils/` | Stateless helper functions (no framework dependencies) |

## Path alias

`@/*` resolves to `src/*` (configured in `tsconfig.json` via `paths`). Always use the alias for imports that cross top-level directories:

```ts
import { paginationQuerySchema } from '@/common/schemas/index.js'
```

Use relative imports only within the same top-level directory.
