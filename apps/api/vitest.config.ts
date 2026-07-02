import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Keep in sync with src/tests/worker-count.ts (TEST_WORKER_COUNT) — duplicated
// here because vitest.config.ts is loaded before the src/ alias is set up.
const TEST_WORKER_COUNT = 4

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    globalSetup: ['src/tests/global-setup.ts'],
    // Each worker gets its own Postgres schema (see global-setup.ts), keyed
    // off Vitest's VITEST_POOL_ID — cap workers so the pre-provisioned
    // schema count (TEST_WORKER_COUNT) always covers every pool id in use.
    pool: 'forks',
    maxWorkers: TEST_WORKER_COUNT,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/server.ts'],
    },
  },
})
