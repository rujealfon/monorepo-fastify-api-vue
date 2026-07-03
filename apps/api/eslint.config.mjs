import createConfig from '@monorepo-fastify-api-vue/eslint-config/create-config'

export default createConfig({}, {
  rules: {
    'node/no-process-env': 'off',
    'unicorn/filename-case': 'off',
  },
}, {
  // Path alias: import from src/ via @/ instead of climbing with ../
  files: ['src/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['../*'],
        message: 'Use the @/ alias instead of parent-relative (../) imports.',
      }],
    }],
  },
})
