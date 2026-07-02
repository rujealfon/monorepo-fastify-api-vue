import createConfig from '@monorepo-fastify-api-vue/eslint-config/create-config'
import pluginVitest from '@vitest/eslint-plugin'
import pluginCypress from 'eslint-plugin-cypress'

export default createConfig({
  vue: true,
  ignores: ['dist-ssr/**', 'coverage/**'],
}, {
  rules: {
    'node/no-process-env': 'off',
    'unicorn/filename-case': 'off',
  },
}, {
  ...pluginCypress.configs.recommended,
  files: [
    'cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}',
    'cypress/support/**/*.{js,ts,jsx,tsx}',
  ],
}, {
  ...pluginVitest.configs.recommended,
  files: ['src/**/__tests__/*', 'src/**/*.spec.ts'],
})
