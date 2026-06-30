FROM node:24-slim AS base
WORKDIR /app
RUN npm install -g @nubjs/nub

# Install all workspace deps
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/eslint-config ./packages/eslint-config
RUN nub install --frozen-lockfile

# Dev: Vite dev server with hot reload (source mounted via docker-compose volumes)
FROM deps AS dev
WORKDIR /app/apps/web
EXPOSE 5173
CMD ["nubx", "vite", "--host"]

# Build the Vue app
FROM deps AS builder
# Contract source (needed for api-client import chain)
COPY apps/api/src/contract ./apps/api/src/contract
COPY apps/api/src/common ./apps/api/src/common
COPY apps/api/src/modules ./apps/api/src/modules
# Shared packages source
COPY packages/api-client/src ./packages/api-client/src
COPY packages/eslint-config ./packages/eslint-config
# Web app source
COPY apps/web ./apps/web
RUN nubx vite build --config apps/web/vite.config.ts

# Production: nginx serves static files + proxies /api
FROM nginx:alpine AS production
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_URL=http://app:3000
EXPOSE 80
