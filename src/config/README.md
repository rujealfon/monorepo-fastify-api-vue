# src/config/

Environment variable validation and the `AppConfig` type.

## Files

| File | Purpose |
|---|---|
| `schema.ts` | JSON Schema object consumed by `@fastify/env` + the `AppConfig` interface |
| `index.ts` | Re-exports `AppConfig` and `configSchema`; adds `FastifyInstance.config` type augmentation |

## How it works

`@fastify/env` validates `process.env` against `configSchema` at startup and decorates the Fastify instance with `fastify.config`. If any required variable is missing the app exits immediately with a clear error.

## Adding a new variable

1. Add it to `AppConfig` in `schema.ts`:
   ```ts
   MY_VAR: string
   ```
2. Add it to the `properties` block (and `required` if mandatory):
   ```ts
   MY_VAR: { type: 'string', default: 'fallback' }
   ```
3. Add it to `.env.example` with a description comment.

No other files need to change — `fastify.config.MY_VAR` is immediately available everywhere after `envPlugin` is registered.

## Required variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 characters |
| `VALKEY_URL` | Valkey connection string (use the `redis://` protocol scheme) |

## Optional variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `HOST` | `0.0.0.0` | |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | `info` | Pino log levels |
| `COOKIE_SECRET` | *(empty → JWT_SECRET)* | Secret for signed cookies |
| `OTEL_ENDPOINT` | *(empty → disabled)* | OTLP HTTP trace exporter URL |
| `TRUST_PROXY` | *(empty → disabled)* | Fastify trusted proxy setting for deriving `request.ip` behind a reverse proxy |
