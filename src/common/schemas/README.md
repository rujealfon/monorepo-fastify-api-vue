# src/common/schemas/

Shared Zod schemas used across multiple modules. No domain-specific logic.

## Exports

| Schema / helper | Shape | Used for |
|---|---|---|
| `paginationQuerySchema` | `{ page: number, limit: number }` | `?page=1&limit=10` query params on all list endpoints |
| `uuidParamSchema` | `{ id: string (UUID) }` | `:id` path param on all resource endpoints |
| `paginationSchema` | `{ page, limit, total }` | Pagination metadata in list responses |
| `apiErrorSchema` | `{ success: false, error: { code, message, fields? } }` | Error responses in route schemas |
| `apiSuccessSchema(T)` | `{ success: true, data: T, message? }` | Single-item success responses |
| `apiListSchema(T)` | `{ success: true, data: T[], pagination }` | Paginated list success responses |
| `PaginationQuery` | `z.infer<typeof paginationQuerySchema>` | — |
| `Pagination` | `z.infer<typeof paginationSchema>` | — |
| `UuidParam` | `z.infer<typeof uuidParamSchema>` | — |
| `ApiError` | `z.infer<typeof apiErrorSchema>` | — |

## Usage

```ts
import { paginationQuerySchema, uuidParamSchema } from '@/common/schemas/index.js'

fastify.get('/:id', {
  schema: {
    params: uuidParamSchema,
    querystring: paginationQuerySchema,
  },
  handler: ...,
})
```

## Rule

Only add schemas here if they are used in **two or more modules**. Single-module schemas belong in `modules/<domain>/schemas/index.ts`.
