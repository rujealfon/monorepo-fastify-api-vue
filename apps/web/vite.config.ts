import vue from '@vitejs/plugin-vue'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const apiSrc = fileURLToPath(new URL('../api/src', import.meta.url))
const webSrc = fileURLToPath(new URL('./src', import.meta.url))
const apiModuleSchemas = ['audit-logs', 'auth', 'permissions', 'products', 'roles', 'users']

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^@\/common\/constants\//, replacement: `${apiSrc}/common/constants/` },
      { find: /^@\/common\/schemas\//, replacement: `${apiSrc}/common/schemas/` },
      { find: /^@\/contract\//, replacement: `${apiSrc}/contract/` },
      ...apiModuleSchemas.map(moduleName => ({
        find: new RegExp(`^@/modules/${moduleName}/schemas/`),
        replacement: `${apiSrc}/modules/${moduleName}/schemas/`,
      })),
      { find: '@', replacement: webSrc },
    ],
  },
  server: {
    host: true,
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
})
