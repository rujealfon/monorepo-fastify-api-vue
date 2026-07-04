# Deploying to Vercel (with Neon)

Vercel supports Docker containers directly (see [Does Vercel support Docker deployments?](https://vercel.com/kb/guide/does-vercel-support-docker-deployments) and [Dockerfile on Vercel](https://vercel.com/blog/dockerfile-on-vercel)). This repo deploys as **two Vercel projects**:

- `apps/web` — native Vercel static/SSR build (Vite), no Docker needed.
- `apps/api` — Docker container (Fastify), built from `Dockerfile.vercel`.

Database is [Neon](https://neon.tech) Postgres — no static IP required since Neon is reachable over the public internet with TLS.

## 1. Create the Neon project

1. Create a Neon project + database (e.g. `fastify_prod`).
2. Neon gives you two connection strings:
   - **Pooled** (host has `-pooler` suffix, port 5432, goes through PgBouncer) — use this for `DATABASE_URL` (the running app).
   - **Direct** (no `-pooler` suffix) — use this only for running migrations (`nub run db:migrate`), since some migration tooling doesn't play well through a transaction pooler.
3. Both connection strings already include `?sslmode=require`. Keep that — Neon requires TLS.

## 2. Code changes (already applied on this branch)

1. **SSL made explicit in the DB client** — `apps/api/src/db/index.ts` now sets `ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined`. Production (Neon) forces TLS; local/test stays unauthenticated since the docker-compose Postgres has no SSL configured. Pool size is now configurable via `DB_POOL_MAX` (defaults to 10, documented in `apps/api/.env.example`).

2. **`PORT` note** — `apps/api/src/config/schema.ts` defaults `PORT` to `3000`; the root `Dockerfile` (used for the existing Fly/Docker setup) hardcodes `ENV PORT=8000` / `EXPOSE 8000`. `Dockerfile.vercel` deliberately omits both — Vercel injects its own `$PORT` at runtime and the app already reads it from env at `apps/api/src/server.ts` (`app.listen({ port: app.config.PORT, host: app.config.HOST })`), with `HOST` already defaulting to `0.0.0.0`. No further server code changes needed.

3. **`Dockerfile.vercel`** — created at the repo root, mirrors the existing root `Dockerfile`'s multi-stage build (`deps` → `builder` → `production`) but drops the hardcoded `PORT`/`EXPOSE`.

## 3. Deploy the API (`apps/api`)

1. In Vercel, **New Project** → import this repo → leave **Root Directory** as the repo root (`Dockerfile.vercel` lives there and its `COPY` paths are relative to the repo root, matching the monorepo layout).
2. Set project environment variables (Project Settings → Environment Variables):
   - `DATABASE_URL` — Neon **pooled** connection string
   - `JWT_SECRET` — random 32+ char string
   - `MOBILE_API_KEY` — random 32+ char string (`openssl rand -hex 32`)
   - `NODE_ENV=production`
   - `CORS_ORIGIN` — the web app's deployed URL (e.g. `https://your-app.vercel.app`)
   - `HOST=0.0.0.0`
   - Leave `VALKEY_URL` unset — Valkey is currently disabled in this codebase (`src/plugins/valkey.ts`); rate limiting falls back to in-memory storage. Fine for a single container instance; revisit if you scale to multiple replicas (in-memory rate limits are per-instance, not shared).
3. Deploy. Vercel builds `Dockerfile.vercel`, runs it as a Vercel Function (Fluid compute), autoscaling on traffic and to zero after 5 minutes idle.
4. Run migrations once, against Neon's **direct** (non-pooled) URL, from your machine or CI — not from the Vercel container:
   ```
   DATABASE_URL=<neon-direct-url> nub run db:migrate
   ```

## 4. Deploy the web app (`apps/web`)

1. Second Vercel project, root directory `apps/web`. Vercel auto-detects Vite — no Docker needed here.
2. Set build-time env var:
   - `VITE_API_URL=https://<your-api-project>.vercel.app` (baked into the client bundle at build time — see `apps/web/src/shared/api/client.ts`)
3. Deploy.

## Known limitations vs. current Docker/Fly setup

- **No static outbound IP / no Secure Compute** for Vercel containers — fine here since Neon is public+TLS, but if you ever add another backend that requires IP allowlisting, it won't work without a proxy.
- **Scale-to-zero after 5 min idle** — cold starts on the API container after inactivity; first request after idle will be slower.
- **In-memory rate limiting is per-instance** — with autoscaling to multiple container replicas, rate limits won't be shared across them. Re-enable Valkey (`src/plugins/valkey.ts`) with a managed Valkey/Redis reachable over the public internet if you need shared rate limiting across replicas.
- Neon's pooled connection (PgBouncer, transaction mode) has a cap on concurrent connections — keep `max` in `apps/api/src/db/index.ts` reasonable relative to your Neon plan's limits, especially if the API scales to multiple container replicas (`max` × replica count must stay under Neon's pooler limit).
