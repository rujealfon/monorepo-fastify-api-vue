import createConfig from '@monorepo-fastify-api-vue/eslint-config/create-config'
import pluginVitest from '@vitest/eslint-plugin'
import pluginCypress from 'eslint-plugin-cypress'

const { plugins: _vitestPlugins, ...vitestRecommended } = pluginVitest.configs.recommended

export default createConfig({
  vue: true,
  ignores: ['dist-ssr/**', 'coverage/**'],
}, {
  rules: {
    'node/no-process-env': 'off',
    'unicorn/filename-case': 'off',
  },
}, {
  // Feature boundaries: a feature may only reach outside itself via @/shared
  // or @/app aliases; cross-feature imports are forbidden.
  files: ['src/features/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/features/*'],
        message: 'Features must not import from other features. Use relative imports within a feature, or move shared code to @/shared.',
      }],
    }],
  },
}, {
  ...pluginCypress.configs.recommended,
  files: [
    'cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}',
    'cypress/support/**/*.{js,ts,jsx,tsx}',
  ],
}, {
  ...vitestRecommended,
  files: ['src/**/__tests__/*', 'src/**/*.spec.ts'],
})
