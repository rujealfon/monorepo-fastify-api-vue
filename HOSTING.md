# Hosting Options

Pay-per-usage preference: avoid paying for idle app servers when possible.

## Recommended Stack

| Piece | Host | Why |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Static Vue/Vite hosting, generous free tier. |
| API | Google Cloud Run | Runs the existing Fastify Docker app, scales to zero, bills by usage. |
| Postgres | Neon | Serverless Postgres with scale-to-zero and usage-based billing. |

This is the best fit for the current repo because the API is already a Dockerized Fastify app, while the frontend is a static Vite build.

Valkey is currently disabled. API rate limiting uses the in-memory `@fastify/rate-limit` store, which is fine for one API instance. Re-enable Valkey before horizontal scaling.

## Cost Snapshot

Prices change. Re-check official pricing pages before deploying production.

| Platform | Good For | Rough Starter Cost | Notes |
| --- | --- | ---: | --- |
| Cloud Run + Cloudflare Pages + Neon | Lowest idle cost with existing architecture | Usage-based | Best overall pay-per-usage fit. |
| Render | Simple all-in-one deployment | About `$13/mo` | Predictable, easy, but less usage-based. |
| Railway | Usage-based app hosting | `$5/mo` minimum, often `$10-$30/mo+` | Convenient, but always-on DB can add up. |
| Fly.io | Global app runtime | `$40+/mo` with managed Postgres | Good infra, but managed Postgres starts higher. |
| Vercel + Neon | Frontend-first deployments | `$0+` | Great for frontend; Fastify API would need adaptation to Functions. |

## Infrastructure Ownership

Most app platforms do not publish exact datacenter buildings. Treat this as provider/region guidance, not a facility audit.

| Platform | Owns/runs infrastructure? | What it uses or exposes |
| --- | --- | --- |
| Google Cloud Run | Yes, Google Cloud infrastructure | Google Cloud regions and zones. |
| Cloudflare Pages | Yes, Cloudflare global edge network | Cloudflare CDN/edge network; China network runs through JD Cloud. |
| Neon | No | Serverless Postgres on cloud providers, commonly AWS and Azure regions. |
| Render | Not clearly published as owned datacenters | Render regions: Oregon, Ohio, Virginia, Frankfurt, Singapore; static sites use a global CDN. |
| Railway | Partly/unclear; branded as Railway Metal | Railway regions: California, Virginia, Amsterdam, Singapore. Region IDs reference metal/colo locations. |
| Fly.io | Yes, for app servers | Fly says apps run in datacenters around the world on servers they run themselves. |
| Vercel | No for core runtime | Vercel runs its platform on cloud infrastructure; functions/edge expose Vercel regions. Postgres is a marketplace provider. |

Infrastructure references:

- Google Cloud locations: <https://cloud.google.com/about/locations>
- Cloudflare network docs: <https://developers.cloudflare.com/network/>
- Neon regions: <https://neon.com/docs/introduction/regions>
- Render regions: <https://render.com/docs/regions>
- Railway regions: <https://docs.railway.com/deployments/regions>
- Fly.io regions: <https://fly.io/docs/reference/regions/>
- Vercel regions: <https://vercel.com/docs/regions>

## Render

Best if simplicity matters more than pure pay-per-usage.

| Piece | Rough Cost |
| --- | ---: |
| Static frontend | `$0/mo` |
| API web service | `$7/mo` Starter |
| Postgres | `$6/mo` Basic 256MB |

Realistic minimum: `$13/mo` for frontend + API + Postgres.

Pricing: <https://render.com/pricing>

## Railway

Best of Render/Railway/Fly for usage-based billing, but not always cheapest once databases run continuously.

| Item | Cost |
| --- | ---: |
| Hobby plan | `$5` minimum usage |
| Pro plan | `$20` minimum usage |
| CPU | `$0.00000772 / vCPU-sec` |
| Memory | `$0.00000386 / GB-sec` |
| Volumes | `$0.00000006 / GB-sec` |
| Egress | `$0.05 / GB` |

Realistic minimum: `$5/mo`, often `$10-$30/mo+` with API and Postgres running.

Pricing: <https://railway.com/pricing>

## Fly.io

Good runtime and regions, but managed Postgres is not the cheapest starter path.

| Piece | Rough Cost |
| --- | ---: |
| Small API machine | About `$3.32/mo` if always running |
| Managed Postgres Basic | `$38/mo` |
| Managed Postgres storage | `$0.28 / provisioned GB-month` |

Realistic minimum: `$40+/mo` with managed Postgres.

Pricing: <https://fly.io/docs/about/pricing/>
Managed Postgres: <https://fly.io/docs/mpg/#pricing>

## Vercel

Best used for the Vue frontend only. The current Fastify API is a long-running Docker app, not a native Vercel Functions app.

| Piece | Cost |
| --- | ---: |
| Hobby plan | `$0/mo` |
| Pro plan | `$20/mo`, includes `$20` usage credit |
| Hobby bandwidth | `100 GB/mo` included |
| Pro bandwidth | `1 TB/mo` included, then from `$0.15/GB` |
| Hobby functions | `1M` invocations, `4h` active CPU, `360 GB-hrs` memory included |
| Pro functions | CPU from about `$0.128/hr`, memory from about `$0.0106/GB-hr`, invocations `$0.60/1M` |
| Postgres | External provider, commonly Neon |

Use Vercel if frontend deploy flow matters. Keep the API on Cloud Run unless you intentionally rewrite/adapt it for serverless functions.

Pricing: <https://vercel.com/pricing>
Functions: <https://vercel.com/docs/functions/usage-and-pricing>
Postgres: <https://vercel.com/docs/postgres>

## Short Decision

Use **Cloud Run + Cloudflare Pages + Neon**.

Use **Render** if you want the easiest predictable deployment.

Use **Vercel** for frontend only.

## Deploy To Render

Use the root [render.yaml](render.yaml) blueprint. It creates the API service, static web service, and Postgres database.

Current app shape on Render:

| Piece | Render resource |
| --- | --- |
| API | Web Service from root `Dockerfile`, target `production` |
| Web | Static Site from `apps/web` build output |
| Database | Render Postgres |
| Valkey | Do not create; currently disabled |

### Recommended: Blueprint

This is the shortest path because `render.yaml` already defines the API, web app, database, env vars, health check, and migration command.

1. Push this repo to GitHub.
2. In Render, click **New**.
3. Choose **Blueprint**. Do not choose **Static Site** for the first deploy.
4. Connect GitHub if Render asks for access.
5. Select this repository.
6. Render should detect `render.yaml`.
7. Confirm the planned resources:
   - `monorepo-fastify-api-vue-api`
   - `monorepo-fastify-api-vue-web`
   - `monorepo-fastify-api-vue-db`
8. Click **Apply** or **Create**.
9. Keep the generated service names unless you also update:
   - API `CORS_ORIGIN`
   - Web `VITE_API_URL`

The API runs migrations automatically with `node dist/db/migrate.js` before deploy.

### Manual: From The Screen In The Screenshot

You are currently on **New Static Site**. That screen is only for the Vue frontend, so create Postgres and the API first.

1. Open the service type dropdown at the top.
2. Choose **Postgres**.
3. Create the database:
   - Name: `monorepo-fastify-api-vue-db`
   - Database: `fastify_prod`
   - User: `fastify`
   - Plan: Basic 256MB
   - Region: Singapore
4. Click **New** again.
5. Choose **Web Service**.
6. Connect GitHub and select this repository.
7. Configure the API service:
   - Name: `monorepo-fastify-api-vue-api`
   - Runtime: Docker
   - Dockerfile path: `Dockerfile`
   - Docker context: `.`
   - Health check path: `/api/v1/health/ready`
   - Plan: Starter
   - Region: Singapore
8. Add API environment variables:
   - `DATABASE_URL`: use the internal connection string from the Render Postgres service
   - `JWT_SECRET`: generate at least 32 random characters
   - `MOBILE_API_KEY`: generate at least 32 random characters
   - `COOKIE_SECRET`: generate at least 32 random characters
   - `NODE_ENV`: `production`
   - `HOST`: `0.0.0.0`
   - `LOG_LEVEL`: `info`
   - `TRUST_PROXY`: `true`
   - `CORS_ORIGIN`: `https://monorepo-fastify-api-vue-web.onrender.com`
9. Set the API pre-deploy command:

```sh
node dist/db/migrate.js
```

10. Deploy the API.
11. Click **New** again.
12. Choose **Static Site**.
13. Select this repository.
14. Configure the web service:
   - Name: `monorepo-fastify-api-vue-web`
   - Build command: `npm install -g @nubjs/nub && nub install --frozen-lockfile && nub run --filter @monorepo-fastify-api-vue/web build`
   - Publish directory: `apps/web/dist`
   - Set `NODE_VERSION` to `24.18.0`
   - Set `VITE_API_URL`: `https://monorepo-fastify-api-vue-api.onrender.com`
15. Add a rewrite rule for SPA routing:
   - Source: `/*`
   - Destination: `/index.html`
16. Deploy the static site.

Keep API instances at `1` while rate limiting uses memory. Re-enable Valkey before multiple API instances.
