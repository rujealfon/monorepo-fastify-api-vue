import vue from '@vitejs/plugin-vue'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const apiSrc = fileURLToPath(new URL('../api/src', import.meta.url))
const webSrc = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^@\/common\/constants\//, replacement: `${apiSrc}/common/constants/` },
      { find: /^@\/common\/schemas\//, replacement: `${apiSrc}/common/schemas/` },
      { find: /^@\/contract\//, replacement: `${apiSrc}/contract/` },
      { find: /^@\/modules\/audit-logs\/schemas\//, replacement: `${apiSrc}/modules/audit-logs/schemas/` },
      { find: /^@\/modules\/auth\/schemas\//, replacement: `${apiSrc}/modules/auth/schemas/` },
      { find: /^@\/modules\/permissions\/schemas\//, replacement: `${apiSrc}/modules/permissions/schemas/` },
      { find: /^@\/modules\/products\/schemas\//, replacement: `${apiSrc}/modules/products/schemas/` },
      { find: /^@\/modules\/roles\/schemas\//, replacement: `${apiSrc}/modules/roles/schemas/` },
      { find: /^@\/modules\/users\/schemas\//, replacement: `${apiSrc}/modules/users/schemas/` },
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
