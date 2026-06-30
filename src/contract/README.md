# src/contract/

RPC contract layer. Defines route schemas once and shares them between the server (`createFastifyRpcPlugin`) and any client (`createApiClient`). A schema change is a type error on both sides simultaneously.

## Files

| File | Purpose |
|---|---|
| `types.ts` | `RouteSchema<>` (generic, fully typed) and `RouteMap` (plain record used at runtime) |
| `client.ts` | `createApiClient` — type-safe fetch client. `RpcError` for non-2xx responses. |
| `index.ts` | Public re-exports |
| `schemas/` | Per-domain route maps (`authSchema`, `usersSchema`, `productsSchema`) |

## Defining a route schema

```ts
import { z } from 'zod'
import type { RouteMap } from '@/contract/types.js'
import { apiErrorSchema, apiListSchema, apiSuccessSchema } from '@/common/schemas/index.js'

export const usersSchema = {
  list: {
    method: 'GET',
    path: '/api/v1/users',
    auth: true,
    tags: ['Users'],
    query: paginationQuerySchema,
    responses: {
      200: apiListSchema(userSchema),
    },
  },
  get: {
    method: 'GET',
    path: '/api/v1/users/:id',
    auth: true,
    params: uuidParamSchema,
    responses: {
      200: apiSuccessSchema(userSchema),
      404: apiErrorSchema,
    },
  },
} satisfies RouteMap
```

## Using the client

```ts
import { createApiClient } from '@/contract/index.js'

const api = createApiClient('http://localhost:3000', { getToken: () => token })
const result = await api.users.list({ query: { page: 1 } })
```

Errors thrown as `RpcError` with `.status` and `.data` from the server response.

## Rules

- Schema files in `schemas/` must only import from `zod` and `@/contract/types.js` — no Fastify, no Drizzle, no services. This keeps the contract portable to non-server environments (e.g. a frontend or CLI client).
- Never put business logic here. Schemas describe the HTTP surface only.
