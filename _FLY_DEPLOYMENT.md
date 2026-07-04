# Deployment: Fly.io + Neon

This deploys both apps to Fly.io:

| Piece | Service |
| --- | --- |
| API | Fly app from root `Dockerfile` |
| Web | Fly app from `apps/web/Dockerfile` |
| Database | Neon Postgres |
| Valkey | Not used |

The web container serves Vue with nginx and proxies `/api` to the API app over Fly's private network.

## 1. Create Neon Database

1. Create a Neon project at <https://neon.com>.
2. Choose Singapore or the closest available region.
3. Copy the pooled connection string.
4. Keep it as `DATABASE_URL`.

## 2. Install Fly CLI

```sh
brew install flyctl
fly auth login
```

## 3. Pick App Names

Fly app names are globally unique. If these names are taken, edit both files:

- [fly.api.toml](fly.api.toml)
- [fly.web.toml](fly.web.toml)

If you rename the apps, also update:

- `fly.api.toml` `CORS_ORIGIN`
- `fly.web.toml` `API_URL`

## 4. Create Fly Apps

```sh
fly apps create monorepo-fastify-api-vue-api
fly apps create monorepo-fastify-api-vue-web
```

## 5. Set API Secrets

```sh
fly secrets set -a monorepo-fastify-api-vue-api \
  DATABASE_URL='YOUR_NEON_DATABASE_URL' \
  JWT_SECRET="$(openssl rand -hex 32)" \
  MOBILE_API_KEY="$(openssl rand -hex 32)" \
  COOKIE_SECRET="$(openssl rand -hex 32)"
```

`CORS_ORIGIN` is already in [fly.api.toml](fly.api.toml). Change it if your web app name changes.

## 6. Deploy API

```sh
fly deploy -c fly.api.toml
```

The API deploy runs migrations automatically through:

```sh
node dist/db/migrate.js
```

## 7. Deploy Web

```sh
fly deploy -c fly.web.toml
```

The web app builds Vue and serves it with nginx. Leave `VITE_API_URL` unset so the browser calls same-origin `/api`, which nginx proxies to the API app internally.

## 8. Check Deployment

API:

```sh
curl -i https://monorepo-fastify-api-vue-api.fly.dev/api/v1/health/ready
```

Web:

```sh
open https://monorepo-fastify-api-vue-web.fly.dev
```

## 9. Redeploy

API:

```sh
fly deploy -c fly.api.toml
```

Web:

```sh
fly deploy -c fly.web.toml
```

## Notes

- Region `sin` is Singapore.
- Keep one API machine while rate limiting uses memory.
- Fly autostop/autostart is enabled for both apps.
- Stopped Fly machines can still have small storage cost.
- Re-enable Valkey or another shared store before scaling the API horizontally.
