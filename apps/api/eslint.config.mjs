import createConfig from '@monorepo-fastify-api-vue/eslint-config/create-config'

export default createConfig({}, {
  rules: {
    'node/no-process-env': 'off',
    'unicorn/filename-case': 'off',
  },
})
