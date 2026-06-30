# src/modules/profile/

"Who am I?" endpoint — returns the authenticated user's own data without requiring an ID in the URL.

## Endpoint

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/profile` | Get the current user's profile |

## Response

```json
// 200
{
  "success": true,
  "data": {
    "id": "019ee4e4-bd7d-7e0d-8402-eeb73c578a00",
    "email": "alice@example.com",
    "profile": {
      "firstName": "Alice",
      "lastName": "Smith",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bio": "Software engineer",
      "phoneNumber": "+1234567890",
      "birthDate": "1990-01-15"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Identity resolution

`userId` is extracted from the JWT by `fastify.authenticate` and stored in `request.requestContext` — no `:id` param is accepted.

## Updating / deleting

Profile updates and account deletion go through `PATCH /api/v1/users/:id` and `DELETE /api/v1/users/:id` respectively.
