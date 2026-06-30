# src/modules/users/

User management module. All endpoints require a valid JWT (`Authorization: Bearer <token>`).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/users` | List users — paginated (`?page&limit`) |
| GET | `/api/v1/users/:id` | Get a single user by UUID |
| POST | `/api/v1/users` | Create a user |
| PATCH | `/api/v1/users/:id` | Partially update a user |
| DELETE | `/api/v1/users/:id` | Soft-delete a user (sets `deletedAt`) |

## Soft deletes

DELETE sets `deletedAt = now()` rather than removing the row. All read queries filter `where(isNull(users.deletedAt))`. Soft-deleted users are invisible to all API consumers.

## Key schemas (`schemas/index.ts`)

Schemas define both the validation rules and the TypeScript types via `z.infer<>`.

| Schema | Describes |
|---|---|
| `createUserSchema` | POST body |
| `updateUserSchema` | PATCH body (all fields optional) |
| `userResponseSchema` | Single user response |
| `usersListResponseSchema` | Paginated list response |

## Service conventions

- Services accept `db: Db` as the first parameter — no Fastify dependency.
- Throw domain errors (`NotFoundError`, `ConflictError`, …) from `@/common/errors/` — the global error handler serialises them automatically.
