# src/common/hooks/

Global Fastify lifecycle hooks registered via `fastify-plugin` (parent scope, applied to all routes).

## Files

| File | Hook | What it does |
|---|---|---|
| `request-id.ts` | `onRequest` | Reads `x-request-id` header (or generates a UUID v4). Sets it on the response header and in `request.requestContext` so it's accessible anywhere in the call stack. |

## Adding a hook

Create a new file and wrap it with `fp`:

```ts
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const myHook: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // ...
  })
}

export default fp(myHook, { name: 'my-hook' })
```

Then import and `await fastify.register(myHook)` in `app.ts`.

## Hook execution order

Fastify hooks run in registration order within each lifecycle phase. The `request-id` hook runs after `requestContextPlugin` (which sets up the AsyncLocalStorage store) so that writing to `request.requestContext` is safe.
