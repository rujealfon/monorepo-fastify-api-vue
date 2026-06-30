# src/plugins/

One file per Fastify plugin. Every file wraps its plugin with `fastify-plugin` (`fp`) so it registers in the **parent scope** (decorators and hooks are visible to all routes).

## Registration order (app.ts)

The order matters — plugins that depend on `fastify.config`, `fastify.valkey`, etc. must be registered after their dependencies.

```
envPlugin          ← must be first; all others read fastify.config
sensiblePlugin     ← httpErrors / reply helpers
helmetPlugin       ← security headers
compressPlugin     ← response compression (brotli › gzip › deflate)
corsPlugin
cookiePlugin       ← needs fastify.config (COOKIE_SECRET)
scalarPlugin       ← Swagger spec + Scalar UI
valkeyPlugin       ← fastify.valkey — must precede rate-limit
rateLimitPlugin    ← Valkey-backed; reads fastify.valkey
dbPlugin           ← fastify.db
underPressurePlugin← auto-503 when heap/loop thresholds exceeded
multipartPlugin    ← file upload body parser
requestContextPlugin← AsyncLocalStorage per request
metricsPlugin      ← /metrics endpoint
jwtPlugin          ← fastify.jwt
authDecorator      ← fastify.authenticate (uses fastify.jwt)
requestIdHook      ← writes requestId into request context
```

## Plugin reference

| File | Package | Adds |
|---|---|---|
| `sensible.ts` | `@fastify/sensible` | `fastify.httpErrors.*`, `reply.notFound()`, etc. |
| `compress.ts` | `@fastify/compress` | Transparent response compression (global, ≥1 KB) |
| `helmet.ts` | `@fastify/helmet` | Security response headers |
| `cors.ts` | `@fastify/cors` | CORS — production-restricted by `NODE_ENV` |
| `cookie.ts` | `@fastify/cookie` | Signed cookie parsing (`COOKIE_SECRET` \| `JWT_SECRET`) |
| `valkey.ts` | `@valkey/valkey-glide` | `fastify.valkey` — shared Valkey GLIDE client |
| `rate-limit.ts` | `@fastify/rate-limit` | Production-only per-IP rate limiting (Redis store, 100 req / 15 min) |
| `db.ts` | `drizzle-orm` | `fastify.db` — typed Drizzle ORM instance |
| `under-pressure.ts` | `@fastify/under-pressure` | Auto-503 when heap > 200 MB, RSS > 300 MB, or loop delay > 1 s |
| `multipart.ts` | `@fastify/multipart` | File upload support (10 MB / file, max 10 files) |
| `request-context.ts` | `@fastify/request-context` | `request.requestContext` — stores `requestId`, `userId` |
| `metrics.ts` | `prom-client` | `fastify.metricsRegistry`, `/metrics` Prometheus endpoint |
| `jwt.ts` | `@fastify/jwt` | `fastify.jwt`, `request.jwtVerify()` (24 h expiry) |
| `scalar.ts` | `@fastify/swagger` + `@scalar/fastify-api-reference` | OpenAPI spec at `/openapi.json`, Scalar UI at `/` |

## Adding a new plugin

1. Create `src/plugins/<name>.ts`:
   ```ts
   import type { FastifyPluginAsync } from 'fastify'
   import fp from 'fastify-plugin'

   const myPlugin: FastifyPluginAsync = async (fastify) => {
     // register or decorate here
   }

   export default fp(myPlugin, { name: 'my-plugin' })
   ```
2. Import and `await fastify.register(myPlugin)` in `app.ts` at the correct position in the order.
3. If the plugin adds a decorator, extend `FastifyInstance` in the same file:
   ```ts
   declare module 'fastify' {
     interface FastifyInstance { myThing: MyType }
   }
   ```
