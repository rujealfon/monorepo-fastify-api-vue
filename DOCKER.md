# Docker Setup Guide

Everything runs in Docker — API, Vue dev server, database, and tooling. All services are defined in `docker-compose.yml` at the repo root.

---

## Local Development

```bash
# 1. Copy env files
cp apps/api/.env.example apps/api/.env

# 2. Start everything
docker-compose up -d

# 3. Run migrations + seed (first time only)
nub run db:migrate
nub run db:seed
```

That's it. Two URLs:

| URL | What |
|---|---|
| `http://localhost:5173` | Vue app (Vite dev server, hot reload) |
| `http://localhost:3000` | Fastify API |

The Vue container proxies `/api` → `http://api:3000` inside Docker. No env vars needed.

---

## Services

| Service | Container | Port | Description |
|---|---|---|---|
| `postgres` | `fastify_postgres` | `5432` | PostgreSQL 18 |
| `valkey` | `fastify_valkey` | `6379` | Valkey cache, currently commented out |
| `api` | `fastify_api` | `3000` | Fastify API — hot reload via `nub watch` |
| `web` | `fastify_web` | `5173` | Vue Vite dev server — hot reload |
| `drizzle-studio` | `fastify_drizzle_studio` | `4983` | Drizzle Studio |
| `pgadmin` | `fastify_pgadmin` | `5050` | pgAdmin 4 |

The `web-prod` service (nginx) is opt-in via `--profile web-prod` — used for production deploys only.

---

## Production Deployment

### Same server (nginx serving Vue + proxying API)

```bash
docker-compose --profile web-prod up -d
```

nginx starts on port `80`, serves the built Vue SPA, and proxies `/api` → `http://api:3000`.

Override `API_URL` if the API is on a different host:
```bash
API_URL=https://api.example.com docker-compose --profile web-prod up -d
```

---

### S3 + VPS (static Vue + separate API server)

**API on VPS:**
```bash
docker-compose up -d
```

Set `CORS_ORIGIN` to your CloudFront/S3 URL in `apps/api/.env` or `docker-compose.yml`:
```
CORS_ORIGIN=https://your-cloudfront.com
```

**Build Vue for S3:**
```bash
VITE_API_URL=https://api.your-vps.com nub run --filter @monorepo-fastify-api-vue/web build
aws s3 sync apps/web/dist/ s3://your-bucket --delete
```

S3: enable static website hosting. CloudFront: add error response 404 → `/index.html` (status 200) for SPA routing.

---

### Vue in Docker on a separate server

```bash
docker build -f apps/web/Dockerfile --target production -t my-app-web .
docker run -d -p 80:80 -e API_URL=https://api.your-vps.com my-app-web
```

---

## Environment Variables

| Var | Where | When |
|---|---|---|
| `VITE_API_URL` | Baked into Vue bundle at **build time** | S3/CDN — no proxy available |
| `API_URL` | Injected into nginx at **container startup** | `web-prod` Docker profile |

Neither is needed for local development — the `web` container proxies `/api` to the `api` container internally.

---

## Useful Commands

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f web

# Restart API (e.g. after changing a plugin or env var)
docker-compose restart api

# Run all tests
nub run test

# Run a single test file
docker exec -e NODE_ENV=test fastify_api nubx vitest run src/tests/modules/users.test.ts

# Open a psql shell
docker exec -it fastify_postgres psql -U postgres -d fastify_dev

# Stop all services (data preserved)
docker-compose down

# Stop and wipe all volumes
docker-compose down -v
```

---

## Schema Changes & Migrations

```bash
# After editing apps/api/src/db/schema/
nub run db:generate   # generate migration SQL
nub run db:migrate    # apply to dev + test databases
```

---

## Resetting the Database

### Full reset (wipes volumes)
```bash
docker-compose down -v
docker-compose up -d
nub run db:migrate
nub run db:seed
```

### Data-only reset
```bash
docker exec -it fastify_postgres psql -U postgres -c "DROP DATABASE IF EXISTS fastify_dev WITH (FORCE);"
docker exec -it fastify_postgres psql -U postgres -c "CREATE DATABASE fastify_dev;"
nub run db:migrate
nub run db:seed
```

---

## Drizzle Studio

Port `4983` is the backend. Open the UI at:

```
https://local.drizzle.studio
```

---

## pgAdmin

`http://localhost:5050` — log in with `admin@admin.com` / `admin`. The `fastify_dev` server is pre-configured in the sidebar.

---

## Fix Stale Dependencies

If a container can't find a package after `nub install` changes:

```bash
docker-compose build api drizzle-studio web
docker-compose up -d --force-recreate api drizzle-studio web
```
