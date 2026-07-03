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
├── app/                        # App-level setup & config
│   ├── App.vue
│   ├── main.ts
│   ├── router/
│   │   └── index.ts            # Root router, assembles feature routes
│   ├── plugins/
│   │   └── index.ts            # Vue plugins
│   └── layouts/
│       ├── DefaultLayout.vue
│       └── AuthLayout.vue
│
├── features/
│   ├── about/
│   │   ├── routes.ts
│   │   └── views/
│   │       └── AboutView.vue
│   ├── health/
│   │   ├── health.api.ts       # Raw API calls, no Vue
│   │   ├── health.queries.ts   # Pinia Colada server state
│   │   ├── routes.ts
│   │   └── views/
│   │       ├── HealthView.vue
│   │       └── HealthView.spec.ts
│   └── home/
│       ├── routes.ts
│       └── views/
│           └── HomeView.vue
│
├── shared/                     # Cross-feature, app-agnostic code
│   ├── api/
│   │   └── client.ts           # api-client singleton
│   └── components/
│       ├── HelloWorld.spec.ts
│       ├── HelloWorld.vue
│       ├── TheWelcome.vue
│       ├── WelcomeItem.vue
│       └── icons/
│           ├── IconCommunity.vue
│           ├── IconDocumentation.vue
│           ├── IconEcosystem.vue
│           ├── IconSupport.vue
│           └── IconTooling.vue
│
└── assets/
    ├── styles/
    │   ├── base.css
    │   └── main.css
    └── images/
        └── logo.svg
```

As features grow, keep feature-only files in that feature folder and split into subfolders only when the folder gets crowded. Co-locate tests next to the code they cover unless a broader test folder becomes useful.

Rules:

- A feature may import from `@/shared/*`, never from a sibling feature.
- Components never call `api` directly. Raw API functions live in `features/<feature>/<feature>.api.ts`; Pinia Colada hooks live in `features/<feature>/<feature>.queries.ts`.
- Pinia stores are for UI/client state only, such as filters, selection, or wizard steps.
- API types come from `@monorepo-fastify-api-vue/api-client`; do not hand-write them.

## API Client

Use the singleton from `src/shared/api/client.ts`:

```ts
import { api } from '@/shared/api/client'
```

The local health page is available at `/health` and calls `api.health.live()`, which resolves to `GET /api/v1/health/live`.

Set `VITE_API_URL` only for static/CDN deploys that need an absolute API origin.

## Server State

Pinia Colada is registered after Pinia in `src/app/main.ts`. Use it from feature query modules:

- Keep raw API calls in `features/<feature>/<feature>.api.ts` or `shared/api/`.
- Wrap reads with `useQuery()` and stable keys like `['health', 'live']`.
- Wrap writes with `useMutation()` and invalidate related query keys after success.

## Checks

```sh
pnpm --filter @monorepo-fastify-api-vue/web run test
pnpm --filter @monorepo-fastify-api-vue/web run build
pnpm --filter @monorepo-fastify-api-vue/web run lint
```
