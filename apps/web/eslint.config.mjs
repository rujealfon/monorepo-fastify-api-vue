import createConfig from '@monorepo-fastify-api-vue/eslint-config/create-config'
import pluginVitest from '@vitest/eslint-plugin'
import pluginCypress from 'eslint-plugin-cypress'
import { readdirSync } from 'node:fs'

const { plugins: _vitestPlugins, ...vitestRecommended } = pluginVitest.configs.recommended

const noParentImports = {
  group: ['../*'],
  message: 'Use the @/ alias instead of parent-relative (../) imports.',
}

const features = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)

export default createConfig({
  vue: true,
  ignores: ['dist-ssr/**', 'coverage/**'],
}, {
  rules: {
    'node/no-process-env': 'off',
    'unicorn/filename-case': 'off',
  },
}, {
  // Path alias: import from src/ via @/ instead of climbing with ../
  files: ['src/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [noParentImports] }],
  },
}, ...features.map(feature => ({
  // Feature boundaries: a feature may only reach outside itself via @/shared
  // or @/app aliases; cross-feature imports are forbidden. Its own files are
  // reachable via ./ or @/features/<self>.
  files: [`src/features/${feature}/**`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/features/*', `!@/features/${feature}`, `!@/features/${feature}/**`],
        message: 'Features must not import from other features. Move shared code to @/shared.',
      }, noParentImports],
    }],
  },
})), {
  ...pluginCypress.configs.recommended,
  files: [
    'cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}',
    'cypress/support/**/*.{js,ts,jsx,tsx}',
  ],
}, {
  ...vitestRecommended,
  files: ['src/**/__tests__/*', 'src/**/*.spec.ts'],
})
