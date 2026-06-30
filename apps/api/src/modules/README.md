# src/modules/

Domain modules. Each module owns its full vertical slice: validation schema → business logic → HTTP handler → route definition.

## Modules

| Module | Prefix | Auth |
|---|---|---|
| `auth/` | `/api/v1/auth` | Public |
| `users/` | `/api/v1/users` | JWT required |
| `products/` | `/api/v1/products` | JWT required |
| `health/` | `/health` | Public |

## Internal structure

```
<domain>/
├── schemas/index.ts    # Zod schemas + z.infer<> types (single source of truth)
├── services/           # Business logic + DB queries — no Fastify imports
└── routes/index.ts     # Fastify plugin: binds schemas + handlers to HTTP methods
```

`controllers/` is optional — `health/` uses one because its handler logic is substantial enough to split out. For most modules, handlers live directly in `routes/index.ts`.

## Rules

- **Services** receive `db: Db` (and `valkey` where needed) as parameters — never import from `fastify` directly. This keeps them unit-testable without a running server.
- **Schemas** are the single source of truth for types. Never write a manual `interface` — use `z.infer<>`.
- **Cross-module imports are forbidden** — modules must not import from each other. Shared code belongs in `common/`.

## Adding a new module

1. Create `src/modules/<domain>/` with the structure above.
2. Define Zod schemas in `schemas/index.ts`.
3. Implement services in `services/<domain>.service.ts`.
4. Wire routes in `routes/index.ts`.
5. Register in `app.ts`: `await fastify.register(myRoutes, { prefix: '/api/v1/<domain>' })`.
