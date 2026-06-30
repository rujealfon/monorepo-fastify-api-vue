# src/modules/auth/

Authentication module — user registration and login.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create a new user account |
| POST | `/api/v1/auth/login` | Public | Authenticate and receive a JWT |

## Request / Response shapes

### POST /register

```json
// Body
{ "email": "alice@example.com", "password": "secret1234" }

// 201 Response
{ "success": true, "data": { "id": "<uuid>", "email": "alice@example.com" } }
```

### POST /login

```json
// Body
{ "email": "alice@example.com", "password": "secret1234" }

// 200 Response
{ "success": true, "data": { "token": "<jwt>" } }
```

## JWT payload

```ts
{ sub: string, email: string }
```

`sub` is the user's UUID and is stored in `request.requestContext` as `userId` after `fastify.authenticate` runs on protected routes.

## Key schemas (`schemas/index.ts`)

| Schema | Used for |
|---|---|
| `registerBodySchema` | POST /register body validation |
| `loginBodySchema` | POST /login body validation |
| `authTokensSchema` | Login response data |
| `authUserSchema` | Register response data |
| `JwtPayload` | Type for the JWT payload object |

## Password hashing

`bcryptjs` with 12 salt rounds. Hashing happens in the service layer; controllers never touch raw passwords beyond passing the request body through.
