FROM node:24-slim AS base
WORKDIR /app
RUN npm install -g @nubjs/nub

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN nub install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN nubx tsc && nubx tsc-alias

FROM node:24-slim AS production
WORKDIR /app
RUN npm install -g @nubjs/nub
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN nub install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
ENV PORT=8000
EXPOSE 8000
CMD ["node", "dist/server.js"]
