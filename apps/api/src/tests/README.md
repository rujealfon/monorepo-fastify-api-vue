# src/tests/

Integration tests powered by [Vitest](https://vitest.dev). Tests run against a real database and Valkey — no mocks for infrastructure.

## Structure

```
tests/
├── fixtures/index.ts   # Shared helpers: createTestApp(), registerAndLogin()
└── modules/            # One test file per domain module
    ├── auth.test.ts
    ├── users.test.ts
    └── products.test.ts
```

## Running tests

```bash
# Requires a running PostgreSQL + Valkey (docker-compose is the easiest way)
vitest run

# Watch mode
vitest
```

## Test helpers (`fixtures/index.ts`)

### `createTestApp()`

Boots a full Fastify application (all plugins, routes) and calls `.ready()`. Use in `beforeAll` and close with `app.close()` in `afterAll`.

```ts
import { createTestApp } from '../fixtures/index.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => { app = await createTestApp() })
afterAll(async () => { await app.close() })
```

### `registerAndLogin(app, user?)`

Registers a user (via `/api/v1/auth/register`) and logs in (via `/api/v1/auth/login`). Returns the JWT string extracted from the `Set-Cookie` response header. Pass it as a Bearer token in `app.inject()` calls — `@fastify/jwt` accepts both cookie and Bearer, so this works without a real browser cookie jar.

```ts
const token = await registerAndLogin(app)

const res = await app.inject({
  method: 'GET',
  url: '/api/v1/users',
  headers: { Authorization: `Bearer ${token}` },
})
```

## Conventions

- Each test file is independent — create its own app instance.
- Use `app.inject()` (Fastify's built-in HTTP injection) rather than `fetch` or `supertest`.
- Clean up the database between tests using transactions or truncation to avoid state leakage.
- Never mock the database or Valkey — integration tests must exercise the real adapters.
