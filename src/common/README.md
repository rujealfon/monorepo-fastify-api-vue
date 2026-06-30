# src/common/

Cross-cutting utilities shared across all domain modules. Nothing here is domain-specific.

## Directories

| Directory | Contents |
|---|---|
| `constants/` | Shared constant values and enums (`ROLES`, Postgres error codes) |
| `decorators/` | Fastify instance decorators (e.g. `fastify.authenticate`) |
| `errors/` | `AppError` base class and typed HTTP error subclasses |
| `hooks/` | Fastify lifecycle hooks applied globally via `fastify-plugin` |
| `schemas/` | Shared Zod schemas (pagination query params, UUID param, API error shape) |

## Rules

- No imports from `modules/` — common must not depend on any domain.
- No business logic — only infrastructure-level concerns.
- Everything is wrapped with `fastify-plugin` (where applicable) so it registers in the parent scope.
