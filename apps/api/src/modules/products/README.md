# src/modules/products/

Product management module. All endpoints require a valid JWT (`Authorization: Bearer <token>`).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/products` | List products — paginated (`?page&limit`) |
| GET | `/api/v1/products/:id` | Get a single product by UUID |
| POST | `/api/v1/products` | Create a product |
| PATCH | `/api/v1/products/:id` | Partially update a product |
| DELETE | `/api/v1/products/:id` | Soft-delete a product (sets `deletedAt`) |

## Soft deletes

DELETE sets `deletedAt = now()` on the row. All read queries filter `where(isNull(products.deletedAt))`. Soft-deleted products are invisible to all API consumers.

## Key schemas (`schemas/index.ts`)

| Schema | Describes |
|---|---|
| `createProductSchema` | POST body |
| `updateProductSchema` | PATCH body (all fields optional) |
| `productResponseSchema` | Single product response |
| `productsListResponseSchema` | Paginated list response |

## Service conventions

- Services accept `db: Db` — no Fastify dependency.
- Throw domain errors (`NotFoundError`, `ConflictError`, …) from `@/common/errors/`.
