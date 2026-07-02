# Web App

Vue 3 + Vite frontend for the monorepo.

## Development

Run from the repo root:

```sh
docker-compose up -d
nub run dev
```

The Vite dev server proxies `/api` to `http://localhost:3000`.

## Project Structure

Feature-based layout under `src/`:

```
src/
  features/
    <feature>/
      views/           # route-level components
      composables/     # state + API calls (e.g. useHealth)
      routes.ts        # exports RouteRecordRaw[], lazy-load non-landing views
  shared/
    components/        # cross-feature components
  router/index.ts      # aggregates feature routes
  api.ts               # api-client singleton
```

Rules:

- A feature may import from `@/shared/*` and `@/api`, never from a sibling feature.
- Components never call `api` directly — API calls live in feature composables (or Pinia stores).
- API types come from `@monorepo-fastify-api-vue/api-client`; do not hand-write them.

## API Client

Use the singleton from `src/api.ts`:

```ts
import { api } from '@/api'
```

The local health page is available at `/health` and calls `api.health.live()`, which resolves to `GET /api/v1/health/live`.

Set `VITE_API_URL` only for static/CDN deploys that need an absolute API origin.

## Checks

```sh
pnpm --filter @monorepo-fastify-api-vue/web run test
pnpm --filter @monorepo-fastify-api-vue/web run build
pnpm --filter @monorepo-fastify-api-vue/web run lint
```
