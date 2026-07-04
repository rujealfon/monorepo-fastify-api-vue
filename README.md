# monorepo-fastify-api-vue

A nub-managed monorepo containing a production-ready Fastify API and a Vue 3 frontend. Supports multiple deployment targets: same-server Docker, S3 + VPS, or fully separated.

---

## Workspace Layout

```
.
├── apps/
│   ├── api/              @monorepo-fastify-api-vue/api   Fastify 5 + PostgreSQL + Valkey
│   └── web/              @monorepo-fastify-api-vue/web   Vue 3 + Vite + nginx
├── packages/
│   ├── api-client/       @monorepo-fastify-api-vue/api-client   Typed fetch client
│   └── eslint-config/    @monorepo-fastify-api-vue/eslint-config  Shared ESLint
├── Dockerfile            API multi-stage build
├── docker-compose.yml    Dev services + optional web profile
├── package.json          Root workspace
├── pnpm-workspace.yaml
└── tsconfig.json         Shared TypeScript base
```

## Tech Stack

| App / Package            | Stack                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `apps/api`               | Fastify 5, TypeScript, PostgreSQL, Drizzle ORM, Valkey, Zod, JWT, OpenTelemetry                   |
| `apps/web`               | Vue 3, Vite, TypeScript, Pinia, Vue Router, Vitest, Cypress, nginx (Docker) / S3+CloudFront (CDN) |
| `packages/api-client`    | Source-first typed fetch client derived from the Fastify contract schemas                         |
| `packages/eslint-config` | `@antfu/eslint-config` wrapper shared across all workspaces                                       |

## Package Roles

| Package                                   | Role                                                                                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@monorepo-fastify-api-vue/api`           | Fastify API in Docker. Owns the RPC contract (`src/contract/`), Drizzle migrations, and all business logic. Exports `./contract` for `api-client`.                   |
| `@monorepo-fastify-api-vue/web`           | Vue 3 app. Vite in dev, Pinia + Vue Router in app code, Vitest for unit tests, Cypress for e2e, nginx in Docker prod, S3/CloudFront as static files.                 |
| `@monorepo-fastify-api-vue/api-client`    | Source-first — re-exports `createApiClient`, `RpcError`, and types from the API contract. Vite resolves TypeScript through workspace symlinks, no build step needed. |
| `@monorepo-fastify-api-vue/eslint-config` | Wraps `@antfu/eslint-config`, exports `createConfig()`. Used by all workspaces.                                                                                      |

## Dependency Flow

```
@monorepo-fastify-api-vue/api
  └── exports ./contract  ──→  @monorepo-fastify-api-vue/api-client
                                  └── re-exports  ──→  @monorepo-fastify-api-vue/web

@monorepo-fastify-api-vue/eslint-config  ──→  api, web, api-client
```

---

## Prerequisites

- Node.js 24+
- nub
- Docker + Docker Compose

## Quick Start

```bash
nub install
cp .env.example .env   # set JWT_SECRET and MOBILE_API_KEY — openssl rand -hex 32
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker-compose up -d
nub run db:migrate
nub run db:seed
nub run dev   # Vue at http://localhost:5173
```

---

## Root Scripts

| Command                             | What it does                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `nub run dev`                       | All workspace `dev` in parallel. Starts Vite for web; API must be up via Docker. |
| `nub run build`                     | All workspace `build`.                                                           |
| `nub run test`                      | All workspace `test` in parallel. API requires Docker container running.         |
| `nub run test:unit`                 | API vitest suite inside Docker container.                                        |
| `nub run test:e2e`                  | Web Cypress e2e against Vite preview on `127.0.0.1:4173`.                        |
| `nub run test:e2e:dev`              | Web Cypress interactive runner against Vite dev on `127.0.0.1:4173`.             |
| `nub run lint` / `nub run lint:fix` | Lint all workspaces.                                                             |
| `nub run db:generate`               | Generate Drizzle migration after schema edits.                                   |
| `nub run db:migrate`                | Apply migrations to dev + test databases.                                        |
| `nub run db:seed`                   | Seed the dev database.                                                           |

---

## Development Workflow

### API (Fastify)

Always runs in Docker with hot reload:

```bash
docker-compose up -d          # start all services
docker-compose logs -f app    # watch logs
```

Run a single test file:

```bash
docker exec -e NODE_ENV=test fastify_api nubx vitest run src/tests/modules/users.test.ts
```

### Web (Vue)

```bash
nub run dev   # Vite at http://localhost:5173 — proxies /api → localhost:3000
nub run --filter @monorepo-fastify-api-vue/web typecheck
nub run --filter @monorepo-fastify-api-vue/web test       # Vitest
nub run --filter @monorepo-fastify-api-vue/web test:e2e   # Cypress headless
```

For interactive Cypress:

```bash
nub run test:e2e:dev
```

The Cypress scripts start Vite on `127.0.0.1:4173` through `start-server-and-test`.

---

## Deployment

| Scenario                          | Command                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Dev (API in Docker, Vue via Vite) | `docker-compose up -d` + `nub run dev`                                                                |
| Same server (both in Docker)      | `docker-compose --profile web up -d`                                                                  |
| S3 + VPS                          | Build Vue with `VITE_API_URL=https://api.example.com`, upload `dist/` to S3, set `CORS_ORIGIN` on API |
| Docker web on separate host       | `docker run -e API_URL=https://api.example.com -p 80:80 <web-image>`                                  |

See [DOCKER.md](DOCKER.md) for full details on each scenario.

---

## API Client Usage

`apps/web/src/shared/api/client.ts` exports a singleton configured via `VITE_API_URL`:

```ts
import { api } from '@/shared/api/client';

const users = await api.users.list({ query: { page: 1, limit: 10 } });
```

The web health page at `/health` uses `api.health.live()` (`GET /api/v1/health/live`).

| Deploy target | `VITE_API_URL`             | Behavior                        |
| ------------- | -------------------------- | ------------------------------- |
| Local dev     | _(unset)_                  | Vite proxy → `localhost:3000`   |
| Docker nginx  | _(unset)_                  | nginx proxy → `http://app:3000` |
| S3 / CDN      | `https://api.your-vps.com` | Direct calls to VPS             |

---

## Environment Variables

### `apps/api/.env`

Copy from `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET`, `MOBILE_API_KEY`.
Set `CORS_ORIGIN` when the frontend is on a different domain.

### `apps/web/.env`

Copy from `.env.example`. Set `VITE_API_URL` only for S3/CDN deploys. Leave empty for local dev and Docker.

---

## TypeScript Configuration

Root `tsconfig.json` sets shared flags. Each workspace extends it:

| Workspace             | `module`   | `moduleResolution` | Notes                                                                                                                    |
| --------------------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/api`            | `NodeNext` | `NodeNext`         | Emits to `dist/`; `@/*` → `./src/*`                                                                                      |
| `apps/web`            | `ESNext`   | `Bundler`          | `vue-tsc`; `@/*` → `./src/*`; API contract aliases resolve `@/common`, `@/contract`, and `@/modules` to `apps/api/src/*` |
| `packages/api-client` | `ESNext`   | `Bundler`          | `noEmit`; `@/*` → `../../apps/api/src/*`                                                                                 |

`apps/web` also has separate TypeScript project references for tool config files (`tsconfig.node.json`), app source (`tsconfig.app.json`), and Vitest (`tsconfig.vitest.json`). Cypress has its own `apps/web/cypress/tsconfig.json`.

---

## ESLint

`packages/eslint-config` wraps `@antfu/eslint-config` and exports `createConfig()`:

```js
// apps/api/eslint.config.mjs
import createConfig from "@monorepo-fastify-api-vue/eslint-config/create-config"
export default createConfig()

// apps/web/eslint.config.mjs
import createConfig from "@monorepo-fastify-api-vue/eslint-config/create-config"
export default createConfig({ vue: true })
```

`@antfu/eslint-config` enforces TypeScript documentation key order in `tsconfig.json` via `perfectionist/sort-keys`. Run `eslint tsconfig.json --fix` after manual edits.
The web config also scopes Vitest rules to `src/**/__tests__/*` and Cypress rules to `cypress/**`.

---

## Adding a Workspace Package

Add apps under `apps/`, reusable packages under `packages/`. nub reads the existing workspace glob in `pnpm-workspace.yaml`.

Use `@monorepo-fastify-api-vue/<name>` as the package name and `workspace:^` for cross-package dependencies.

---

## Docs

| Topic                                        | File                                     |
| -------------------------------------------- | ---------------------------------------- |
| API endpoints, RBAC, env vars                | [apps/api/README.md](apps/api/README.md) |
| Web scaffold and Vue commands                | [apps/web/README.md](apps/web/README.md) |
| Docker setup, profiles, deployment scenarios | [DOCKER.md](DOCKER.md)                   |
