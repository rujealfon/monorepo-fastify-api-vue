import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: ['dist/**', 'migrations/**', '**/*.md', '**/package.json', '**/tsconfig.json'],
})
