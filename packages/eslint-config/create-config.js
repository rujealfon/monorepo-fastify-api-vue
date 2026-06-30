import antfu from '@antfu/eslint-config'

const defaultIgnores = ['dist/**', 'migrations/**', '**/*.md', '**/package.json', '**/tsconfig.json']

export default function createConfig(options = {}, ...userConfigs) {
  const { ignores = [], ...antfuOptions } = options

  return antfu({
    type: 'app',
    typescript: true,
    formatters: true,
    stylistic: true,
    // stylistic: {
    //   indent: 2,
    //   semi: true,
    //   quotes: 'double',
    // },
    ...antfuOptions,
    ignores: [...defaultIgnores, ...ignores],
  }, {
    rules: {
      'no-console': ['warn'],
      'ts/consistent-type-definitions': ['error', 'type'],
      'antfu/no-top-level-await': ['off'],
      'node/prefer-global/process': ['off'],
      'node/no-process-env': ['error'],
      'perfectionist/sort-imports': ['error', {
        tsconfigRootDir: '.',
      }],
      'unicorn/filename-case': ['error', {
        case: 'kebabCase',
        ignore: ['README.md'],
      }],
    },
  }, {
    files: ['**/*.d.ts'],
    rules: {
      'ts/consistent-type-definitions': ['error', 'interface'],
    },
  }, ...userConfigs)
}
