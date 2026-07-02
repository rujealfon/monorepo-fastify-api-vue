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
      { find: /^@\/common\//, replacement: `${apiSrc}/common/` },
      { find: /^@\/contract\//, replacement: `${apiSrc}/contract/` },
      { find: /^@\/modules\//, replacement: `${apiSrc}/modules/` },
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
