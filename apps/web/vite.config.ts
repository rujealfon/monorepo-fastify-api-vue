import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Resolves @/ imports from the Fastify API's contract chain
      '@': fileURLToPath(new URL('../../apps/api/src', import.meta.url)),
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
})
