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

# Build the API
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY tsconfig.json ./
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
WORKDIR /app/apps/api
RUN nubx tsc && nubx tsc-alias

# Production image — minimal runtime deps only
FROM node:24-slim AS production
WORKDIR /app
RUN npm install -g @nubjs/nub
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/eslint-config ./packages/eslint-config
RUN nub install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/migrations ./apps/api/migrations
WORKDIR /app/apps/api
ENV PORT=8000
EXPOSE 8000
CMD ["node", "dist/server.js"]
