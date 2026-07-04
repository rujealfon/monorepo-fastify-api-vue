# Hosting Options

Pay-per-usage preference: avoid paying for idle app servers when possible.

## Recommended Stack

| Piece    | Host             | Why                                                                   |
| -------- | ---------------- | --------------------------------------------------------------------- |
| Frontend | Cloudflare Pages | Static Vue/Vite hosting, generous free tier.                          |
| API      | Google Cloud Run | Runs the existing Fastify Docker app, scales to zero, bills by usage. |
| Postgres | Neon             | Serverless Postgres with scale-to-zero and usage-based billing.       |

This is the best fit for the current repo because the API is already a Dockerized Fastify app, while the frontend is a static Vite build.

Valkey is currently disabled. API rate limiting uses the in-memory `@fastify/rate-limit` store, which is fine for one API instance. Re-enable Valkey before horizontal scaling.

## Cost Snapshot

Prices change. Re-check official pricing pages before deploying production.

| Platform                            | Good For                                    |                   Rough Starter Cost | Notes                                                                           |
| ----------------------------------- | ------------------------------------------- | -----------------------------------: | ------------------------------------------------------------------------------- |
| Cloud Run + Cloudflare Pages + Neon | Lowest idle cost with existing architecture |                          Usage-based | Best overall pay-per-usage fit.                                                 |
| Render                              | Simple all-in-one deployment                |                        `$0` to start | Free API + static site + free Postgres trial; paid Postgres needed after trial. |
| Railway                             | Usage-based app hosting                     | `$5/mo` minimum, often `$10-$30/mo+` | Convenient, but always-on DB can add up.                                        |
| Fly.io                              | Global app runtime                          |      `$40+/mo` with managed Postgres | Good infra, but managed Postgres starts higher.                                 |
| Vercel + Neon                       | Frontend-first deployments                  |                                `$0+` | Great for frontend; Fastify API would need adaptation to Functions.             |

## Infrastructure Ownership

Most app platforms do not publish exact datacenter buildings. Treat this as provider/region guidance, not a facility audit.

| Platform         | Owns/runs infrastructure?                  | What it uses or exposes                                                                                                     |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Google Cloud Run | Yes, Google Cloud infrastructure           | Google Cloud regions and zones.                                                                                             |
| Cloudflare Pages | Yes, Cloudflare global edge network        | Cloudflare CDN/edge network; China network runs through JD Cloud.                                                           |
| Neon             | No                                         | Serverless Postgres on cloud providers, commonly AWS and Azure regions.                                                     |
| Render           | Not clearly published as owned datacenters | Render regions: Oregon, Ohio, Virginia, Frankfurt, Singapore; static sites use a global CDN.                                |
| Railway          | Partly/unclear; branded as Railway Metal   | Railway regions: California, Virginia, Amsterdam, Singapore. Region IDs reference metal/colo locations.                     |
| Fly.io           | Yes, for app servers                       | Fly says apps run in datacenters around the world on servers they run themselves.                                           |
| Vercel           | No for core runtime                        | Vercel runs its platform on cloud infrastructure; functions/edge expose Vercel regions. Postgres is a marketplace provider. |

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

| Piece           |                    Rough Cost |
| --------------- | ----------------------------: |
| Static frontend |                       `$0/mo` |
| API web service |                  `$0/mo` Free |
| Postgres        | `$0/mo` Free trial, then paid |

Realistic starting cost: `$0/mo`. Render free Postgres is temporary, so expect to upgrade the database when the trial expires.

Pricing: <https://render.com/pricing>

## Railway

Best of Render/Railway/Fly for usage-based billing, but not always cheapest once databases run continuously.

| Item       |                     Cost |
| ---------- | -----------------------: |
| Hobby plan |       `$5` minimum usage |
| Pro plan   |      `$20` minimum usage |
| CPU        | `$0.00000772 / vCPU-sec` |
| Memory     |   `$0.00000386 / GB-sec` |
| Volumes    |   `$0.00000006 / GB-sec` |
| Egress     |             `$0.05 / GB` |

Realistic minimum: `$5/mo`, often `$10-$30/mo+` with API and Postgres running.

Pricing: <https://railway.com/pricing>

## Fly.io

Good runtime and regions, but managed Postgres is not the cheapest starter path.

| Piece                    |                         Rough Cost |
| ------------------------ | ---------------------------------: |
| Small API machine        | About `$3.32/mo` if always running |
| Managed Postgres Basic   |                           `$38/mo` |
| Managed Postgres storage |     `$0.28 / provisioned GB-month` |

Realistic minimum: `$40+/mo` with managed Postgres.

Pricing: <https://fly.io/docs/about/pricing/>
Managed Postgres: <https://fly.io/docs/mpg/#pricing>

## Vercel

Best used for the Vue frontend only. The current Fastify API is a long-running Docker app, not a native Vercel Functions app.

| Piece           |                                                                                  Cost |
| --------------- | ------------------------------------------------------------------------------------: |
| Hobby plan      |                                                                               `$0/mo` |
| Pro plan        |                                                 `$20/mo`, includes `$20` usage credit |
| Hobby bandwidth |                                                                  `100 GB/mo` included |
| Pro bandwidth   |                                              `1 TB/mo` included, then from `$0.15/GB` |
| Hobby functions |                       `1M` invocations, `4h` active CPU, `360 GB-hrs` memory included |
| Pro functions   | CPU from about `$0.128/hr`, memory from about `$0.0106/GB-hr`, invocations `$0.60/1M` |
| Postgres        |                                                      External provider, commonly Neon |

Use Vercel if frontend deploy flow matters. Keep the API on Cloud Run unless you intentionally rewrite/adapt it for serverless functions.

Pricing: <https://vercel.com/pricing>
Functions: <https://vercel.com/docs/functions/usage-and-pricing>
Postgres: <https://vercel.com/docs/postgres>

## Short Decision

Use **Cloud Run + Cloudflare Pages + Neon**.

Use **Render** if you want the easiest predictable deployment.

Use **Vercel** for frontend only.
