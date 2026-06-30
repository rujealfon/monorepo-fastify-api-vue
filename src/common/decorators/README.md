# src/common/decorators/

Fastify instance decorators that add reusable methods to `fastify` or `request`.

## Files

| File | Adds | Usage |
|---|---|---|
| `auth.ts` | `fastify.authenticate` | Place in a route's `preHandler` to require a valid JWT. Also stores `userId` in `request.requestContext`. |

## Pattern

```ts
// In a route definition:
fastify.get('/protected', {
  preHandler: fastify.authenticate,
  handler: async (request) => {
    const userId = request.requestContext.get('userId')
    // ...
  },
})
```

## Adding a decorator

Create a new file following this pattern:

```ts
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    myDecorator: () => void
  }
}

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('myDecorator', () => { ... })
}

export default fp(plugin, { name: 'my-decorator' })
```

Then register it in `app.ts` after any plugins it depends on.
