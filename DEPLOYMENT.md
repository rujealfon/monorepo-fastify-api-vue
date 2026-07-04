# Deployment: Cloudflare Pages + Cloud Run + Neon

This is the pay-as-you-go setup for the current app:

| Piece | Service |
| --- | --- |
| Frontend | Cloudflare Pages |
| API | Google Cloud Run |
| Database | Neon Postgres |
| Valkey | Not used |

Rate limiting currently uses in-memory storage. Keep Cloud Run `max-instances=1` until Valkey or another shared rate-limit store is re-enabled.

## 1. Create Neon Database

1. Go to <https://neon.com>.
2. Create a new project.
3. Choose a region close to the app users. For the Philippines, use Singapore if available.
4. Copy the pooled Postgres connection string.
5. Keep it as `DATABASE_URL`.

The URL should look like:

```txt
postgresql://user:password@host/dbname?sslmode=require
```

## 2. Prepare Google Cloud

Install and log in to the Google Cloud CLI:

```sh
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Enable required services:

```sh
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

Create an Artifact Registry repository:

```sh
gcloud artifacts repositories create monorepo-fastify-api-vue \
  --repository-format=docker \
  --location=asia-southeast1
```

## 3. Build And Push API Image

Build from the repo root:

```sh
gcloud builds submit \
  --tag asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/monorepo-fastify-api-vue/api:latest
```

## 4. Create API Secrets

Create secrets for Cloud Run:

```sh
printf '%s' 'YOUR_NEON_DATABASE_URL' | gcloud secrets create DATABASE_URL --data-file=-
openssl rand -hex 32 | gcloud secrets create JWT_SECRET --data-file=-
openssl rand -hex 32 | gcloud secrets create MOBILE_API_KEY --data-file=-
openssl rand -hex 32 | gcloud secrets create COOKIE_SECRET --data-file=-
```

If a secret already exists, add a new version instead:

```sh
printf '%s' 'YOUR_NEON_DATABASE_URL' | gcloud secrets versions add DATABASE_URL --data-file=-
```

Grant Cloud Run access to the secrets if Google Cloud asks for it:

```sh
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role='roles/secretmanager.secretAccessor'
```

Repeat that IAM command for `JWT_SECRET`, `MOBILE_API_KEY`, and `COOKIE_SECRET`.

## 5. Deploy API To Cloud Run

Deploy the API:

```sh
gcloud run deploy monorepo-fastify-api-vue-api \
  --image asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/monorepo-fastify-api-vue/api:latest \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8000 \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars NODE_ENV=production,HOST=0.0.0.0,LOG_LEVEL=info,TRUST_PROXY=true,CORS_ORIGIN=https://YOUR_PAGES_DOMAIN.pages.dev \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,MOBILE_API_KEY=MOBILE_API_KEY:latest,COOKIE_SECRET=COOKIE_SECRET:latest
```

## 6. Run Database Migrations

Run migrations against Neon from the production image:

```sh
gcloud run jobs create monorepo-fastify-api-vue-migrate \
  --image asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/monorepo-fastify-api-vue/api:latest \
  --region asia-southeast1 \
  --command node \
  --args dist/db/migrate.js \
  --set-secrets DATABASE_URL=DATABASE_URL:latest

gcloud run jobs execute monorepo-fastify-api-vue-migrate \
  --region asia-southeast1 \
  --wait
```

For later deploys, update the job image if needed and execute it again before releasing app changes that depend on new schema.

## 7. Check API

Get the Cloud Run URL:

```sh
gcloud run services describe monorepo-fastify-api-vue-api \
  --region asia-southeast1 \
  --format='value(status.url)'
```

Check readiness:

```sh
curl -i https://YOUR_CLOUD_RUN_URL/api/v1/health/ready
```

Expected response:

```json
{ "success": true, "data": { "status": "ready" } }
```

## 8. Deploy Web To Cloudflare Pages

1. Go to <https://dash.cloudflare.com>.
2. Open **Workers & Pages**.
3. Click **Create application**.
4. Choose **Pages**.
5. Connect your Git provider and select this repo.
6. Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm install -g @nubjs/nub && nub install --frozen-lockfile && nub run --filter @monorepo-fastify-api-vue/web build` |
| Build output directory | `apps/web/dist` |
| Root directory | `/` |
| Node.js version | `24.18.0` |

7. Add environment variable:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | Your Cloud Run API URL |

8. Deploy.

## 9. Update API CORS

After Cloudflare Pages gives you the final frontend URL, update Cloud Run:

```sh
gcloud run services update monorepo-fastify-api-vue-api \
  --region asia-southeast1 \
  --update-env-vars CORS_ORIGIN=https://YOUR_PAGES_DOMAIN.pages.dev
```

If you also use a custom domain, include both origins comma-separated:

```sh
gcloud run services update monorepo-fastify-api-vue-api \
  --region asia-southeast1 \
  --update-env-vars CORS_ORIGIN=https://YOUR_PAGES_DOMAIN.pages.dev,https://yourdomain.com
```

## 10. Redeploy Flow

API:

```sh
gcloud builds submit \
  --tag asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/monorepo-fastify-api-vue/api:latest

gcloud run jobs execute monorepo-fastify-api-vue-migrate \
  --region asia-southeast1 \
  --wait

gcloud run deploy monorepo-fastify-api-vue-api \
  --image asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/monorepo-fastify-api-vue/api:latest \
  --region asia-southeast1
```

Web:

Cloudflare Pages redeploys automatically on Git push if connected to the repo.

## Notes

- Cloud Run region `asia-southeast1` is Singapore.
- Neon should use Singapore or the closest available region.
- Keep Cloud Run at one max instance while rate limiting uses memory.
- Re-enable Valkey or another shared store before increasing Cloud Run max instances.
