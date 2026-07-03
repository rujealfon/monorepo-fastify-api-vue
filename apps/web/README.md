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

Feature-based layout under `src/`. Data fetching uses [Pinia Colada](https://pinia-colada.esm.dev/) (`useQuery` / `useMutation`) on top of Pinia:

```
src/
├── app/                        # App-level setup & config
│   ├── layouts/                # App shells (DefaultLayout.vue, AuthLayout.vue)
│   └── plugins/                # Vue plugin registration (Pinia, PiniaColada, i18n, …)
│       ├── index.ts            # registerPlugins(app) — installs Pinia + PiniaColada
│       └── pinia-colada.ts     # Global PiniaColada query/mutation defaults
│
├── assets/
│   ├── styles/                 # Global CSS (main.css, base.css)
│   └── images/                 # Static images (logo.svg, …)
│
├── features/                   # ⭐ One folder per domain feature
│   └── <feature>/              # e.g. health/, users/, auth/
│       ├── views/              # Route-level pages (lazy-loaded from routes.ts)
│       ├── components/         # Components used ONLY by this feature
│       ├── composables/        # UI-facing composables that wrap queries/mutations
│       ├── queries.ts          # Query key factory + defineQueryOptions for reads
│       ├── mutations.ts        # useMutation wrappers (write + cache invalidation)
│       ├── stores/             # Pinia stores for client-only state (not server data)
│       └── routes.ts           # Exports RouteRecordRaw[]
│
├── shared/                     # Cross-feature code (no feature imports here)
│   ├── api/
│   │   └── client.ts           # api-client singleton
│   ├── components/             # Reusable UI components
│   ├── composables/            # Reusable composables (useDebounce, useToast, …)
│   └── utils/                  # Pure helpers (formatters, guards)
│
├── router/
│   └── index.ts                # Root router, aggregates feature routes
├── App.vue
└── main.ts
```

Per-feature data layer:

- `queries.ts` — the only place query keys are written. Export a key factory and `defineQueryOptions` bundles:

  ```ts
  export const HEALTH_KEYS = {
    root: ['health'] as const,
    live: () => [...HEALTH_KEYS.root, 'live'] as const,
  };

  export const healthLiveQuery = defineQueryOptions({
    key: HEALTH_KEYS.live(),
    query: () => api.health.live(),
  });
  ```

- `mutations.ts` — `useMutation` wrappers that invalidate the feature's keys in `onSettled` via `useQueryCache()`.
- `composables/` — what components actually import; compose queries/mutations with UI state. Use `defineQuery` here when several mounted components must share the same reactive state (e.g. a shared search ref).
- `stores/` — Pinia stores only for client-side state (UI prefs, wizard state, session). Server data belongs in the Colada query cache, not stores.

Rules:

- A feature may import from `@/shared/*` (including `@/shared/api/client`), never from a sibling feature. ESLint enforces this (`no-restricted-imports` in `eslint.config.mjs`): another feature's `@/features/*` path is an error; a feature's own files are reachable via `./` or `@/features/<self>`.
- Parent-relative (`../`) imports are ESLint errors everywhere in `src/` — use the `@/` alias to reach outside the current directory.
- Components never call `api` directly — API calls live in feature queries/mutations, consumed through composables.
- Every reactive value used inside a `query` function must appear in its `key` (use a getter key: `key: () => [...]`).
- API types come from `@monorepo-fastify-api-vue/api-client`; do not hand-write them.

## API Client

Use the singleton from `src/shared/api/client.ts`:

```ts
import { api } from '@/shared/api/client';
```

The local health page is available at `/health` and calls `api.health.live()`, which resolves to `GET /api/v1/health/live`.

Set `VITE_API_URL` only for static/CDN deploys that need an absolute API origin.

## Checks

```sh
pnpm --filter @monorepo-fastify-api-vue/web run test
pnpm --filter @monorepo-fastify-api-vue/web run build
pnpm --filter @monorepo-fastify-api-vue/web run lint
```
